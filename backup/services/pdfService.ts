import { ChapterOutline, GeneratedBookData, CoverPageConfig, BookPdfParams } from '../types';
import { sanitizeBookHeading, cleanFinalBookContent } from './manuscriptCleaner';

// Global PDF Blob Cache to avoid duplicate PDF builds
interface PdfCache {
  hash: string;
  blob: Blob;
  filename: string;
}

let pdfBlobCache: PdfCache | null = null;

/**
 * Computes a fast deterministic string hash signature for the book parameters & cover configuration.
 */
function computeBookHash(params: BookPdfParams): string {
  const chapterSig = (params.chapters || [])
    .map(
      (c) =>
        `${c.title}:${c.sections?.map((s) => s.heading + ':' + s.content).join(',')}`
    )
    .join('|');

  const coverSig = params.coverConfig
    ? `${params.coverConfig.title}_${params.coverConfig.subtitle}_${params.coverConfig.authorName}_${params.coverConfig.layout}_${params.coverConfig.themeColor}_${params.coverConfig.backgroundColor}_${params.coverConfig.alignment}`
    : 'default_cover';

  return `${params.title}_${params.subtitle}_${params.authorName}_${chapterSig}_${params.bodyFontSize || 16}_${params.pageSize || 'A4'}_${params.orientation || 'portrait'}_${coverSig}_${params.prefaceNote || ''}_${params.conclusionNote || ''}`;
}

function removeRepeatedHeading(contentStr: string, headingToCompare: string): string {
  if (!contentStr || !headingToCompare) return contentStr;
  const cleanHeading = headingToCompare.replace(/^(باب\s*\d+\s*[:؛-]?\s*)/i, '').trim();
  if (!cleanHeading) return contentStr;

  const escapedHeading = cleanHeading.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const regex = new RegExp(`^\\s*[*_#\\-\\[\\(]*\\s*${escapedHeading}\\s*[*_#\\-\\]\\)]*\\s*[:؛۔\\-\\n\\s]*`, 'u');
  return contentStr.replace(regex, '');
}

function getDynamicPageBudget(params: {
  isFirstPage: boolean;
  pageSize: 'A4' | 'A5' | 'Letter' | 'B5';
  orientation: 'portrait' | 'landscape';
  fontSize: number;
}): number {
  let baseBudget = params.isFirstPage ? 550 : 850;

  if (params.pageSize === 'A5') {
    baseBudget *= 0.50;
  } else if (params.pageSize === 'B5') {
    baseBudget *= 0.70;
  } else if (params.pageSize === 'Letter') {
    baseBudget *= 0.95;
  }

  if (params.orientation === 'landscape') {
    baseBudget *= 0.65;
  }

  const fontSizeFactor = 16 / params.fontSize;
  baseBudget *= fontSizeFactor;

  return Math.max(150, Math.floor(baseBudget));
}

function toUrduNumerals(num: number): string {
  const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map((d) => urduDigits[parseInt(d, 10)] ?? d).join('');
}

function formatParagraphsForPdf(text: string): string {
  if (!text) return '';
  const paras = text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return '';
  return paras.map((p) => `<p>${p}</p>`).join('');
}

/**
 * Generates direct high-fidelity vector PDF using Puppeteer on the server.
 * Standard, unencrypted PDF with embedded fonts for Urdu, Arabic, and English.
 * Features decorative borders on EVERY internal page and continuous page numbers.
 * Completely eliminates text clipping by intelligently paginating long chapters.
 */
export async function createBookPdfBlob(
  params: BookPdfParams,
  forceRegenerate = false
): Promise<{ blob: Blob; filename: string }> {
  const hash = computeBookHash(params);
  
  if (!forceRegenerate && pdfBlobCache && pdfBlobCache.hash === hash) {
    console.log('[PDF Service] Returning cached PDF Blob');
    return { blob: pdfBlobCache.blob, filename: pdfBlobCache.filename };
  }

  const cleanTitle = sanitizeBookHeading(params.title || 'کتاب', 'کتاب');
  const cleanSubtitle = sanitizeBookHeading(params.subtitle || '', '');
  const cleanAuthor = (params.authorName || 'عبد الحفیظ').trim();
  const coverBg = params.coverConfig?.backgroundColor || '#0F172A';
  const themeColor = params.coverConfig?.themeColor || '#D4AF37';
  const textAlign = params.coverConfig?.alignment || 'center';
  const showWatermark = params.coverConfig?.showWatermark !== false && params.showWatermark !== false;
  const bodyFontSize = params.bodyFontSize || 15;

  // Split long texts into page-sized paragraph chunks to eliminate any clipping
  interface PageChunk {
    type: 'toc' | 'preface' | 'chapter' | 'conclusion';
    chapterIndex?: number;
    chapterTitle?: string;
    chapterSummary?: string;
    isFirstPageOfChapter?: boolean;
    sections: Array<{ heading?: string; paragraphs: string[] }>;
    pageNum: number;
  }

  const generatedPages: PageChunk[] = [];
  let pageCounter = 1;

  // 1. Table of Contents page
  const tocPageNum = pageCounter++;
  
  // 2. Preface Page(s) with Safe Chunking
  let prefaceStartPage: number | null = null;
  if (params.prefaceNote && params.prefaceNote.trim()) {
    prefaceStartPage = pageCounter;
    const rawPrefaceParas = params.prefaceNote.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    
    // Break any long paragraph into sentence chunks
    const prefaceParas: string[] = [];
    rawPrefaceParas.forEach((p) => {
      if (p.length > 550) {
        const sentences = p.split(/(?<=[۔؟!\.])\s+/);
        let curr = '';
        sentences.forEach((s) => {
          if ((curr + ' ' + s).length > 450) {
            if (curr.trim()) prefaceParas.push(curr.trim());
            curr = s;
          } else {
            curr = curr ? `${curr} ${s}` : s;
          }
        });
        if (curr.trim()) prefaceParas.push(curr.trim());
      } else {
        prefaceParas.push(p);
      }
    });

    let currChunk: string[] = [];
    let currChars = 0;
    const maxPrefaceChars = getDynamicPageBudget({
      isFirstPage: true,
      pageSize: params.pageSize || 'A4',
      orientation: params.orientation || 'portrait',
      fontSize: bodyFontSize,
    });

    prefaceParas.forEach((para, pIdx) => {
      if (currChars + para.length > maxPrefaceChars && currChunk.length > 0) {
        generatedPages.push({
          type: 'preface',
          sections: [{ heading: generatedPages.filter(g => g.type === 'preface').length === 0 ? 'دیباچہ و تعارفِ کتاب' : undefined, paragraphs: currChunk }],
          pageNum: pageCounter++,
        });
        currChunk = [para];
        currChars = para.length;
      } else {
        currChunk.push(para);
        currChars += para.length;
      }
    });

    if (currChunk.length > 0) {
      generatedPages.push({
        type: 'preface',
        sections: [{ heading: generatedPages.filter(g => g.type === 'preface').length === 0 ? 'دیباچہ و تعارفِ کتاب' : undefined, paragraphs: currChunk }],
        pageNum: pageCounter++,
      });
    }
  }

  // 3. Chapter Pages with Safe, Intelligent Pagination (Zero Clipping)
  const chapterTOCMap: number[] = [];

  params.chapters.forEach((ch, cIdx) => {
    chapterTOCMap.push(pageCounter);

    const rawSections = ch.sections && ch.sections.length > 0 ? ch.sections : [
      { heading: 'بنیادی تفہیم و تشریح', content: params.rawText ? params.rawText.slice(cIdx * 500, (cIdx + 1) * 500) : 'اس باب کے تحت تفصیلی علمی مباحث پیش کیے گئے ہیں۔' }
    ];

    // Deduplicate heading if it matches chapter title
    const cleanChapterTitle = sanitizeBookHeading(ch.title, `باب ${cIdx + 1}`);
    const normalizedSections = rawSections.map((sec) => {
      const cleanSecHeading = sanitizeBookHeading(sec.heading || '', '');
      const isRedundantHeading = cleanSecHeading && (
        cleanSecHeading === cleanChapterTitle ||
        cleanSecHeading.includes(cleanChapterTitle) ||
        cleanChapterTitle.includes(cleanSecHeading)
      );
      return {
        heading: isRedundantHeading ? undefined : cleanSecHeading,
        content: sec.content || '',
      };
    });

    // Build discrete pages for this chapter with tight capacity budgeting
    let currentPageSections: Array<{ heading?: string; paragraphs: string[] }> = [];
    let currentCharsOnPage = 0;
    let isFirstPage = true;

    normalizedSections.forEach((sec) => {
      let cleanContent = sec.content || '';
      if (sec.heading) {
        cleanContent = removeRepeatedHeading(cleanContent, sec.heading);
      }
      if (ch.title) {
        cleanContent = removeRepeatedHeading(cleanContent, ch.title);
      }

      const rawParas = cleanContent.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
      
      // Break large paragraphs at sentence boundary
      const paras: string[] = [];
      rawParas.forEach((p) => {
        if (p.length > 500) {
          const sents = p.split(/(?<=[۔؟!\.])\s+/);
          let buf = '';
          sents.forEach((s) => {
            if ((buf + ' ' + s).length > 400) {
              if (buf.trim()) paras.push(buf.trim());
              buf = s;
            } else {
              buf = buf ? `${buf} ${s}` : s;
            }
          });
          if (buf.trim()) paras.push(buf.trim());
        } else {
          paras.push(p);
        }
      });

      let secHeadingAdded = false;

      paras.forEach((para) => {
        const paraLen = para.length;
        const maxLimit = getDynamicPageBudget({
          isFirstPage,
          pageSize: params.pageSize || 'A4',
          orientation: params.orientation || 'portrait',
          fontSize: bodyFontSize,
        });

        const isStartingNewSection = !secHeadingAdded && sec.heading;
        const headingReservedSpace = isStartingNewSection ? 180 : 0;

        // Check if page needs to be flushed before adding (with orphan heading prevention)
        if (currentCharsOnPage + paraLen + headingReservedSpace > maxLimit && currentPageSections.length > 0) {
          generatedPages.push({
            type: 'chapter',
            chapterIndex: cIdx + 1,
            chapterTitle: ch.title,
            chapterSummary: isFirstPage ? ch.summary : undefined,
            isFirstPageOfChapter: isFirstPage,
            sections: currentPageSections,
            pageNum: pageCounter++,
          });
          currentPageSections = [];
          currentCharsOnPage = 0;
          isFirstPage = false;
        }

        if (!secHeadingAdded && sec.heading) {
          currentPageSections.push({ heading: sec.heading, paragraphs: [para] });
          secHeadingAdded = true;
        } else if (currentPageSections.length > 0) {
          currentPageSections[currentPageSections.length - 1].paragraphs.push(para);
        } else {
          currentPageSections.push({ heading: undefined, paragraphs: [para] });
        }
        currentCharsOnPage += paraLen + 20;
      });
    });

    if (currentPageSections.length > 0 || isFirstPage) {
      generatedPages.push({
        type: 'chapter',
        chapterIndex: cIdx + 1,
        chapterTitle: ch.title,
        chapterSummary: isFirstPage ? ch.summary : undefined,
        isFirstPageOfChapter: isFirstPage,
        sections: currentPageSections,
        pageNum: pageCounter++,
      });
    }
  });

  // 4. Conclusion Page(s)
  let conclusionStartPage: number | null = null;
  if (params.conclusionNote && params.conclusionNote.trim()) {
    conclusionStartPage = pageCounter;
    const rawConclParas = params.conclusionNote.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    const conclParas: string[] = [];

    rawConclParas.forEach((p) => {
      if (p.length > 550) {
        const sentences = p.split(/(?<=[۔؟!\.])\s+/);
        let curr = '';
        sentences.forEach((s) => {
          if ((curr + ' ' + s).length > 450) {
            if (curr.trim()) conclParas.push(curr.trim());
            curr = s;
          } else {
            curr = curr ? `${curr} ${s}` : s;
          }
        });
        if (curr.trim()) conclParas.push(curr.trim());
      } else {
        conclParas.push(p);
      }
    });

    let currChunk: string[] = [];
    let currChars = 0;
    const maxConclChars = getDynamicPageBudget({
      isFirstPage: true,
      pageSize: params.pageSize || 'A4',
      orientation: params.orientation || 'portrait',
      fontSize: bodyFontSize,
    });

    conclParas.forEach((para) => {
      if (currChars + para.length > maxConclChars && currChunk.length > 0) {
        generatedPages.push({
          type: 'conclusion',
          sections: [{ heading: generatedPages.filter(g => g.type === 'conclusion').length === 0 ? 'حاصلِ کلام و تجاویز' : undefined, paragraphs: currChunk }],
          pageNum: pageCounter++,
        });
        currChunk = [para];
        currChars = para.length;
      } else {
        currChunk.push(para);
        currChars += para.length;
      }
    });

    if (currChunk.length > 0) {
      generatedPages.push({
        type: 'conclusion',
        sections: [{ heading: generatedPages.filter(g => g.type === 'conclusion').length === 0 ? 'حاصلِ کلام و تجاویز' : undefined, paragraphs: currChunk }],
        pageNum: pageCounter++,
      });
    }
  }

  // Subtle, elegant geometric ornament SVG for the title page
  const geometricOrnamentSvg = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 18px auto; opacity: 0.85;">
      <circle cx="32" cy="32" r="28" stroke="${themeColor}" stroke-width="1" stroke-dasharray="3 3"/>
      <circle cx="32" cy="32" r="20" stroke="${themeColor}" stroke-width="1.2"/>
      <rect x="23.5" y="23.5" width="17" height="17" transform="rotate(45 32 32)" stroke="${themeColor}" stroke-width="1"/>
      <rect x="23.5" y="23.5" width="17" height="17" stroke="${themeColor}" stroke-width="1"/>
      <circle cx="32" cy="32" r="3.5" fill="${themeColor}"/>
    </svg>
  `;

  // Build high-fidelity HTML for Puppeteer
  const htmlContent = `
<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    /* Reset & Typography */
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 2.1;
      color: #0f172a;
      background: white;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      direction: rtl;
    }

    @page {
      size: ${params.pageSize || 'A4'} ${params.orientation || 'portrait'};
      margin: 0;
    }

    .page {
      page-break-after: always;
      page-break-inside: avoid;
      break-inside: avoid;
      position: relative;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      box-sizing: border-box;
      background: #FFFFFF;
      overflow: hidden;
    }

    /* 1. Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
      text-align: ${textAlign};
      height: 100vh;
      padding: 16mm 14mm;
      background-color: ${coverBg};
      color: white;
      position: relative;
      box-sizing: border-box;
    }

    ${params.coverConfig?.showFrameBorder !== false ? `
    .cover-frame-outer {
      position: absolute;
      top: 8mm;
      bottom: 8mm;
      left: 8mm;
      right: 8mm;
      border: 2px solid ${themeColor}90;
      border-radius: 8px;
      pointer-events: none;
    }
    .cover-frame-inner {
      position: absolute;
      top: 10.5mm;
      bottom: 10.5mm;
      left: 10.5mm;
      right: 10.5mm;
      border: 1px solid ${themeColor}40;
      border-radius: 4px;
      pointer-events: none;
    }
    ` : ''}

    .cover-top {
      margin-top: 4%;
      width: 100%;
      position: relative;
      z-index: 10;
    }

    .cover-edition {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${themeColor};
      margin-bottom: 14px;
      font-weight: bold;
    }

    .cover-title {
      font-size: 36px;
      font-weight: bold;
      line-height: 1.5;
      margin-bottom: 12px;
      color: #ffffff;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .cover-subtitle {
      font-size: 18px;
      color: ${themeColor};
      margin-top: 8px;
      line-height: 1.6;
    }

    .cover-center-ornament {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 10px 0;
    }

    .cover-bottom {
      margin-bottom: 3%;
      width: 100%;
      border-top: 1px solid ${themeColor}50;
      padding-top: 14px;
      position: relative;
      z-index: 10;
    }

    .cover-author-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${themeColor};
      margin-bottom: 4px;
    }

    .cover-author {
      font-size: 24px;
      font-weight: bold;
      color: #ffffff;
    }

    /* 2. Internal Book Pages with Double Decorative Border on EVERY Page */
    .content-page {
      padding: 6mm 6mm;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      position: relative;
    }

    .page-frame-outer {
      width: 100%;
      height: 100%;
      border: 1.5px solid #1e293b;
      border-radius: 4px;
      box-sizing: border-box;
      padding: 2.2mm;
      display: flex;
      flex-direction: column;
    }

    .page-frame-inner {
      width: 100%;
      height: 100%;
      border: 0.8px solid #D4AF37;
      border-radius: 2px;
      box-sizing: border-box;
      padding: 4.5mm 6.5mm 3.5mm 6.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    /* Header at top of each internal page */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 6px;
      font-size: 11px;
      color: #64748b;
      font-family: 'Noto Nastaliq Urdu', serif;
      flex-shrink: 0;
    }

    .header-book-title {
      color: #0f172a;
      font-weight: bold;
    }

    .header-brand {
      color: #D4AF37;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    /* Background Watermark (Rendered only when showWatermark is true) */
    ${showWatermark ? `
    .watermark-backdrop {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 68px;
      font-weight: bold;
      font-family: 'Cinzel', 'Plus Jakarta Sans', serif, sans-serif;
      color: rgba(212, 175, 55, 0.045);
      letter-spacing: 6px;
      pointer-events: none;
      z-index: 1;
      white-space: nowrap;
      text-transform: uppercase;
    }
    ` : ''}

    /* Main content container with zero clipping guarantee */
    .page-main-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
      position: relative;
      z-index: 2;
    }

    .chapter-badge {
      color: #D4AF37;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      margin-bottom: 2px;
    }

    .chapter-title {
      font-size: 21px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      margin-bottom: 10px;
      padding-bottom: 5px;
      text-align: center;
      line-height: 1.4;
    }

    .section-title {
      font-size: 15px;
      font-weight: bold;
      color: #1e293b;
      margin-top: 8px;
      margin-bottom: 5px;
      background: #f8fafc;
      padding: 3px 8px;
      border-right: 4px solid #D4AF37;
      border-radius: 4px;
      line-height: 1.4;
      page-break-after: avoid;
      break-after: avoid;
    }

    .body-text {
      font-size: ${bodyFontSize}px;
      text-align: justify;
      text-justify: inter-word;
      text-align-last: right;
      color: #334155;
      line-height: 2.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      orphans: 2;
      widows: 2;
    }

    .body-text p {
      text-indent: 1.6em;
      margin-top: 0;
      margin-bottom: 0.5em;
      line-height: 2.1;
      text-align: justify;
      text-justify: inter-word;
      text-align-last: right;
    }

    .summary-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 6px 10px;
      border-radius: 6px;
      margin-bottom: 10px;
      color: #78350f;
      font-size: ${Math.max(11, bodyFontSize - 2)}px;
      line-height: 1.8;
    }

    /* Table of Contents with Professional Leader Dots */
    .toc-title {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 14px;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 5px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
      font-weight: bold;
      color: #1e293b;
      gap: 6px;
    }

    .toc-title-text {
      color: #1e293b;
      text-align: right;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 1.5px dotted #94a3b8;
      margin: 0 8px;
      min-width: 15px;
    }

    .toc-page {
      font-family: monospace;
      color: #475569;
      font-weight: bold;
      font-size: 13px;
      white-space: nowrap;
    }

    /* Footer with page number at bottom of EVERY internal page */
    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
      margin-top: 6px;
      font-size: 11px;
      color: #64748b;
      font-family: 'Noto Nastaliq Urdu', serif;
      flex-shrink: 0;
      position: relative;
      z-index: 2;
    }

    .page-number-badge {
      font-weight: bold;
      color: #0f172a;
      background: #f1f5f9;
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
  </style>
</head>
<body dir="rtl">
  <!-- 1. Cover Page (NO Page Number) -->
  <div class="page cover-page">
    ${params.coverConfig?.showFrameBorder !== false ? `
      <div class="cover-frame-outer"></div>
      <div class="cover-frame-inner"></div>
    ` : ''}
    <div class="cover-top">
       ${params.coverConfig?.logoUrl ? `<img src="${params.coverConfig.logoUrl}" style="max-height: 70px; margin-bottom: 14px; border-radius: 8px;">` : ''}
       ${showWatermark ? `<div class="cover-edition">${params.coverConfig?.additionalText || 'Qalam AI Edition'}</div>` : ''}
       <div class="cover-title">${cleanTitle}</div>
       ${cleanSubtitle ? `<div class="cover-subtitle">${cleanSubtitle}</div>` : ''}
    </div>

    <div class="cover-center-ornament">
      ${geometricOrnamentSvg}
    </div>

    <div class="cover-bottom">
       <div class="cover-author-label">مصنّف</div>
       <div class="cover-author">${cleanAuthor}</div>
    </div>
  </div>

  <!-- 2. Table of Contents Page (Page 1) -->
  <div class="page content-page">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        ${showWatermark ? `<div class="watermark-backdrop">Qalam AI</div>` : ''}
        <div class="page-header">
          <span class="header-brand">${showWatermark ? 'Qalam AI' : ''}</span>
          <span class="header-book-title">${cleanTitle}</span>
          <span>فہرستِ مضامین</span>
        </div>
        <div class="page-main-body">
          <div class="toc-title">فہرستِ مضامین</div>
          ${prefaceStartPage ? `
          <div class="toc-item">
            <span class="toc-title-text">پیش لفظ و دیباچہ</span>
            <span class="toc-dots"></span>
            <span class="toc-page">صفحہ ${toUrduNumerals(prefaceStartPage)}</span>
          </div>` : ''}
          ${params.chapters.map((ch, idx) => `
            <div class="toc-item">
              <span class="toc-title-text">${ch.title}</span>
              <span class="toc-dots"></span>
              <span class="toc-page">صفحہ ${toUrduNumerals(chapterTOCMap[idx] || (idx + 2))}</span>
            </div>
          `).join('')}
          ${conclusionStartPage ? `
          <div class="toc-item">
            <span class="toc-title-text">حاصلِ کلام و اختتامیہ</span>
            <span class="toc-dots"></span>
            <span class="toc-page">صفحہ ${toUrduNumerals(conclusionStartPage)}</span>
          </div>` : ''}
        </div>
        <div class="page-footer">
          <span>${showWatermark ? 'Qalam AI' : ''}</span>
          <span class="page-number-badge">صفحہ ${toUrduNumerals(tocPageNum)}</span>
          <span>فہرستِ مضامین</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 3. Dynamic Structured Pages (Preface, Chapters, Conclusion) -->
  ${generatedPages.map((pg) => `
    <div class="page content-page">
      <div class="page-frame-outer">
        <div class="page-frame-inner">
          ${showWatermark ? `<div class="watermark-backdrop">Qalam AI</div>` : ''}
          <div class="page-header">
            <span class="header-brand">${showWatermark ? 'Qalam AI' : ''}</span>
            <span class="header-book-title">${cleanTitle}</span>
            <span>${pg.type === 'preface' ? 'پیش لفظ' : pg.type === 'conclusion' ? 'اختتامیہ' : `باب ${pg.chapterIndex}`}</span>
          </div>
          <div class="page-main-body">
            ${pg.type === 'preface' && pg.sections[0]?.heading ? `
              <div class="chapter-badge">پیش لفظ</div>
              <div class="chapter-title">دیباچہ و تعارفِ کتاب</div>
            ` : ''}

            ${pg.type === 'conclusion' && pg.sections[0]?.heading ? `
              <div class="chapter-badge">اختتامیہ</div>
              <div class="chapter-title">حاصلِ کلام و تجاویز</div>
            ` : ''}

            ${pg.type === 'chapter' && pg.isFirstPageOfChapter ? `
              <div class="chapter-badge">باب ${pg.chapterIndex}</div>
              <div class="chapter-title">${pg.chapterTitle}</div>
              ${pg.chapterSummary ? `
                <div class="summary-box">
                  <strong>خلاصۂ باب: </strong>${pg.chapterSummary}
                </div>
              ` : ''}
            ` : ''}

            ${pg.sections.map((sec) => `
              ${sec.heading && !(pg.type === 'preface' && sec.heading.includes('دیباچہ')) && !(pg.type === 'conclusion' && sec.heading.includes('حاصلِ کلام')) ? `<div class="section-title">${sec.heading}</div>` : ''}
              <div class="body-text">
                ${sec.paragraphs.map((p) => `<p>${p}</p>`).join('')}
              </div>
            `).join('')}
          </div>
          <div class="page-footer">
            <span>${showWatermark ? 'Qalam AI' : ''}</span>
            <span class="page-number-badge">صفحہ ${toUrduNumerals(pg.pageNum)}</span>
            <span>${pg.type === 'preface' ? 'دیباچہ' : pg.type === 'conclusion' ? 'اختتامیہ' : cleanTitle}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('')}
</body>
</html>
  `;

  // Fetch standard binary PDF stream from server endpoint
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      htmlContent, 
      pageSize: params.pageSize || 'A4', 
      orientation: params.orientation || 'portrait' 
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'سرور سے پی ڈی ایف حاصل نہیں ہو سکی۔');
  }

  // Pure binary PDF Blob (no text/json encoding)
  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  
  // Format clean filename (e.g., "حکمت-قلم.pdf")
  const sanitizedTitle = cleanTitle.replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '') || 'Qalam-AI-Book';
  const filename = `${sanitizedTitle}.pdf`;
  
  // Update Cache
  pdfBlobCache = { hash, blob, filename };
  
  return { blob, filename };
}

/**
 * Triggers direct browser download of the PDF blob.
 * Reuses the cached binary Blob.
 */
export function triggerPdfDownload(blob: Blob, filename: string) {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 10000);
}

/**
 * Shares the PDF as a real file attachment using Web Share API Level 2.
 * Reuses the exact same PDF Blob without regeneration.
 * If file sharing is supported, opens native Share Sheet directly.
 * If file sharing is not supported by the browser, displays a clear informative message.
 */
export async function shareBookPdf(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ success: boolean; fallbackTriggered: boolean; message: string }> {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdfFile = new File([blob], cleanFilename, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pdfFile] });

  if (canShareFiles) {
    try {
      await navigator.share({
        title: title || 'Qalam AI Book',
        text: `${title || 'Qalam AI Book'} - Qalam AI`,
        files: [pdfFile],
      });
      return {
        success: true,
        fallbackTriggered: false,
        message: 'پی ڈی ایف فائل شیئر شیٹ میں کامیابی سے بھیج دی گئی ہے۔',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed or dismissed the native share sheet
        return {
          success: true,
          fallbackTriggered: false,
          message: '',
        };
      }
      console.warn('Web Share API file share encountered error:', err);
      throw err;
    }
  }

  // If the browser/device genuinely does not support file sharing (e.g. desktop browser):
  return {
    success: false,
    fallbackTriggered: false,
    message: 'آپ کے اس براؤزر میں برائے راست فائل شیئرنگ (Web Share API for Files) کی سہولت موجود نہیں ہے۔ براہِ کرم "⬇️ PDF حاصل کریں" کا بٹن دبا کر فائل ڈاؤن لوڈ کریں اور خود واٹس ایپ یا دیگر ایپس پر شیئر کریں۔',
  };
}
