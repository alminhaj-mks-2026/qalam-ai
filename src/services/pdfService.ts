import { ChapterOutline, GeneratedBookData, CoverPageConfig, BookPdfParams, StyleOverrides } from '../types';
import { sanitizeBookHeading, cleanFinalBookContent } from './manuscriptCleaner';
import { formatScriptAwareHtml } from './scriptTypography';

// Global PDF Blob Cache to avoid duplicate PDF builds
interface PdfCache {
  hash: string;
  blob: Blob;
  filename: string;
}

let pdfBlobCache: PdfCache | null = null;

function serializeStyles(s?: StyleOverrides): string {
  if (!s) return '';
  return `${s.fontFamily || ''}_${s.fontSize || ''}_${s.fontWeight || ''}_${s.fontStyle || ''}_${s.textDecoration || ''}_${s.alignment || ''}_${s.spacing || ''}_${s.positionOffset || ''}_${s.pageBreakBefore ? 't' : 'f'}`;
}

function getStyleHtmlString(styles?: StyleOverrides): string {
  if (!styles) return '';
  const parts: string[] = [];
  if (styles.fontFamily) {
    parts.push(`font-family: ${styles.fontFamily}`);
  }
  if (styles.fontSize) {
    parts.push(`font-size: ${styles.fontSize}px`);
  }
  if (styles.fontWeight) {
    parts.push(`font-weight: ${styles.fontWeight}`);
  }
  if (styles.fontStyle) {
    parts.push(`font-style: ${styles.fontStyle}`);
  }
  if (styles.textDecoration) {
    parts.push(`text-decoration: ${styles.textDecoration}`);
  }
  if (styles.alignment) {
    parts.push(`text-align: ${styles.alignment}`);
    if (styles.alignment === 'justify') {
      parts.push(`text-align-last: justify`);
    } else {
      parts.push(`text-align-last: ${styles.alignment}`);
    }
  }
  if (styles.spacing !== undefined) {
    parts.push(`margin-bottom: ${styles.spacing}px`);
  }
  if (styles.positionOffset !== undefined && styles.positionOffset !== 0) {
    parts.push(`transform: translateY(${styles.positionOffset}px)`);
  }
  if (styles.pageBreakBefore) {
    parts.push(`page-break-before: always`);
    parts.push(`break-before: page`);
  }
  return parts.length > 0 ? `style="${parts.join('; ')}"` : '';
}

/**
 * Computes a fast deterministic string hash signature for the book parameters & cover configuration.
 */
function computeBookHash(params: BookPdfParams): string {
  const chapterSig = (params.chapters || [])
    .map(
      (c) =>
        `${c.title}:${serializeStyles(c.titleStyles)}:${c.sections?.map((s) => `${s.heading}:${serializeStyles(s.headingStyles)}:${s.content}:${serializeStyles(s.contentStyles)}`).join(',')}`
    )
    .join('|');

  const coverSig = params.coverConfig
    ? `${params.coverConfig.title}_${params.coverConfig.subtitle}_${params.coverConfig.authorName}_${params.coverConfig.layout}_${params.coverConfig.themeColor}_${params.coverConfig.backgroundColor}_${params.coverConfig.alignment}`
    : 'default_cover';

  const prefaceSig = serializeStyles(params.prefaceStyles);
  const conclusionSig = serializeStyles(params.conclusionStyles);

  return `${params.title}_${params.subtitle}_${params.authorName}_${chapterSig}_${params.bodyFontSize || 16}_${params.pageSize || 'A4'}_${params.orientation || 'portrait'}_${coverSig}_${params.prefaceNote || ''}_${prefaceSig}_${params.conclusionNote || ''}_${conclusionSig}`;
}

function removeRepeatedHeading(contentStr: string, headingToCompare: string): string {
  if (!contentStr || !headingToCompare) return contentStr;
  const cleanHeading = headingToCompare.replace(/^(باب\s*\d+\s*[:؛-]?\s*)/i, '').trim();
  if (!cleanHeading) return contentStr;

  try {
    const escapedHeading = cleanHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*[*_#\\-\\[\\(]*\\s*${escapedHeading}\\s*[*_#\\-\\]\\)]*\\s*[:؛۔\\-\\n\\s]*`, 'u');
    return contentStr.replace(regex, '');
  } catch (e) {
    return contentStr;
  }
}

function formatParagraphsForPdf(text: string): string {
  if (!text) return '';
  return formatScriptAwareHtml(text);
}

/**
 * Generates direct high-fidelity vector PDF using Puppeteer on the server.
 * Standard, unencrypted PDF with embedded fonts for Urdu, Arabic, and English.
 * Features natural A4 physical layout flow with zero artificial page breaks.
 * Headings protected against orphans; running header/footer with page numbers.
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

  // Build natural HTML document flow for Puppeteer
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
      line-height: 2.15;
      color: #0f172a;
      background: white;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      direction: rtl;
    }

    @page {
      size: ${params.pageSize || 'A4'} ${params.orientation || 'portrait'};
      margin: 16mm 14mm 16mm 14mm;
    }

    @page :first {
      margin: 0;
    }

    /* 1. Cover Page */
    .cover-page {
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
      text-align: ${textAlign};
      height: 297mm;
      padding: 18mm 14mm;
      background-color: ${coverBg};
      color: white;
      position: relative;
      z-index: 10;
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
      margin-top: 6%;
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
      margin-bottom: 5%;
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

    /* 2. Table of Contents Page */
    .toc-page {
      page-break-after: always;
      break-after: page;
      padding: 4mm 6mm;
      box-sizing: border-box;
    }

    .toc-title {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 16px;
      color: #0f172a;
      border-bottom: 2px solid ${themeColor};
      padding-bottom: 6px;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
      font-weight: bold;
      color: #1e293b;
    }

    .toc-title-text {
      color: #1e293b;
      text-align: right;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 1.5px dotted #94a3b8;
      margin: 0 10px;
      min-width: 20px;
    }

    /* 3. Continuous Document Flow */
    .book-content-flow {
      width: 100%;
      padding: 2mm 6mm;
      box-sizing: border-box;
    }

    .chapter-block {
      margin-bottom: 28px;
    }

    .chapter-badge {
      color: ${themeColor};
      font-weight: bold;
      font-size: 13px;
      text-align: center;
      margin-top: 12px;
      margin-bottom: 2px;
    }

    .chapter-title {
      font-size: 22px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid ${themeColor};
      margin-bottom: 12px;
      padding-bottom: 6px;
      text-align: center;
      line-height: 1.45;
      font-family: 'Noto Nastaliq Urdu', serif;
      break-after: avoid;
      page-break-after: avoid;
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
      background: #f8fafc;
      padding: 4px 10px;
      border-right: 4px solid ${themeColor};
      border-radius: 4px;
      line-height: 1.4;
      font-family: 'Noto Nastaliq Urdu', serif;
      break-after: avoid;
      page-break-after: avoid;
    }

    .summary-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      color: #78350f;
      font-size: ${Math.max(12, bodyFontSize - 2)}px;
      line-height: 1.8;
    }

    /* Page Rectangular Frame - Left and Right Side Lines Connecting with Header & Footer */
    .pdf-page-border-outer {
      position: fixed;
      top: 0;
      bottom: 0;
      left: -5mm;
      right: -5mm;
      border-left: 1.5px solid #1e293b;
      border-right: 1.5px solid #1e293b;
      pointer-events: none;
      z-index: 2;
      box-sizing: border-box;
    }

    .pdf-page-border-inner {
      position: fixed;
      top: 0;
      bottom: 0;
      left: -3.5mm;
      right: -3.5mm;
      border-left: 0.8px solid ${themeColor};
      border-right: 0.8px solid ${themeColor};
      pointer-events: none;
      z-index: 2;
      box-sizing: border-box;
    }

    /* Script-Aware Typography */
    .font-urdu {
      font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif;
      line-height: 2.15;
    }

    .font-arabic {
      font-family: 'Amiri', 'Noto Naskh Arabic', serif;
      line-height: 2.05;
    }

    .font-english {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      line-height: 1.65;
    }

    .body-text {
      font-size: ${bodyFontSize}px;
      color: #334155;
      line-height: 2.15;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .body-p {
      text-indent: 1.6em;
      margin-top: 0;
      margin-bottom: 0.65em;
      line-height: 2.15;
      text-align: justify;
      text-justify: inter-word;
      text-align-last: right;
      orphans: 2;
      widows: 2;
    }

    .english-para {
      text-indent: 1.2em;
      text-align-last: left;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      line-height: 1.65;
      direction: ltr;
    }

    .arabic-para {
      text-indent: 1.2em;
      font-family: 'Amiri', 'Noto Naskh Arabic', serif;
      line-height: 2.05;
      color: #1e1b4b;
      background: #faf5ff50;
      padding: 4px 8px;
      border-right: 2px solid ${themeColor};
      border-radius: 4px;
    }

    .inline-english {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
      display: inline-block;
      direction: ltr !important;
      unicode-bidi: isolate;
      padding: 0 2px;
      font-size: 0.92em;
    }

    .inline-arabic {
      font-family: 'Amiri', 'Noto Naskh Arabic', serif !important;
      direction: rtl !important;
      unicode-bidi: isolate;
      padding: 0 2px;
      font-size: 1.05em;
      color: #1e1b4b;
      font-weight: bold;
    }
  </style>
</head>
<body dir="rtl">
  <div class="pdf-page-border-outer"></div>
  <div class="pdf-page-border-inner"></div>
  <!-- 1. Cover Page -->
  <div class="cover-page">
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

  <!-- 2. Table of Contents Page -->
  <div class="toc-page">
    <div class="toc-title">فہرستِ مضامین</div>
    ${params.prefaceNote && params.prefaceNote.trim() ? `
    <div class="toc-item">
      <span class="toc-title-text">پیش لفظ و دیباچہ</span>
      <span class="toc-dots"></span>
      <span>دیباچہ</span>
    </div>` : ''}
    ${params.chapters.map((ch) => `
      <div class="toc-item">
        <span class="toc-title-text">${ch.title}</span>
        <span class="toc-dots"></span>
        <span>${ch.title.split(':')[0] || 'باب'}</span>
      </div>
    `).join('')}
    ${params.conclusionNote && params.conclusionNote.trim() ? `
    <div class="toc-item">
      <span class="toc-title-text">حاصلِ کلام و اختتامیہ</span>
      <span class="toc-dots"></span>
      <span>اختتامیہ</span>
    </div>` : ''}
  </div>

  <!-- 3. Continuous Natural Document Flow -->
  <div class="book-content-flow">
    <!-- Preface -->
    ${params.prefaceNote && params.prefaceNote.trim() ? `
      <div class="chapter-block" ${getStyleHtmlString(params.prefaceStyles)}>
        <div class="chapter-badge">پیش لفظ</div>
        <div class="chapter-title">دیباچہ و تعارفِ کتاب</div>
        <div class="body-text">
          ${formatParagraphsForPdf(params.prefaceNote)}
        </div>
      </div>
    ` : ''}

    <!-- Chapters -->
    ${params.chapters.map((ch, cIdx) => {
      const cleanChapterTitle = sanitizeBookHeading(ch.title, `باب ${cIdx + 1}`);
      const rawSections = ch.sections && ch.sections.length > 0 ? ch.sections : [
        { heading: 'بنیادی تفہیم و تشریح', content: params.rawText ? params.rawText.slice(cIdx * 500, (cIdx + 1) * 500) : 'اس باب کے تحت تفصیلی علمی مباحث پیش کیے گئے ہیں۔' }
      ];

      return `
        <div class="chapter-block" id="chap-${cIdx + 1}">
          <div class="chapter-badge">باب ${cIdx + 1}</div>
          <div class="chapter-title" ${getStyleHtmlString(ch.titleStyles)}>${cleanChapterTitle}</div>
          ${ch.summary ? `<div class="summary-box"><strong>خلاصۂ باب: </strong>${ch.summary}</div>` : ''}
          ${rawSections.map((sec) => {
            const cleanSecHeading = sanitizeBookHeading(sec.heading || '', '');
            const isRedundant = cleanSecHeading && (
              cleanSecHeading === cleanChapterTitle ||
              cleanSecHeading.includes(cleanChapterTitle) ||
              cleanChapterTitle.includes(cleanSecHeading)
            );

            let cleanContent = sec.content || '';
            if (sec.heading) cleanContent = removeRepeatedHeading(cleanContent, sec.heading);
            if (ch.title) cleanContent = removeRepeatedHeading(cleanContent, ch.title);

            return `
              ${sec.heading && !isRedundant ? `<div class="section-title" ${getStyleHtmlString(sec.headingStyles)}>${sec.heading}</div>` : ''}
              <div class="body-text" ${getStyleHtmlString(sec.contentStyles)}>
                ${formatParagraphsForPdf(cleanContent)}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('')}

    <!-- Conclusion -->
    ${params.conclusionNote && params.conclusionNote.trim() ? `
      <div class="chapter-block" ${getStyleHtmlString(params.conclusionStyles)}>
        <div class="chapter-badge">اختتامیہ</div>
        <div class="chapter-title">حاصلِ کلام و تجاویز</div>
        <div class="body-text">
          ${formatParagraphsForPdf(params.conclusionNote)}
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>
  `;

  // Header & Footer templates for Puppeteer
  const headerTemplate = `
    <style>
      * { box-sizing: border-box; }
    </style>
    <div style="width: 100%; height: 16mm; position: relative; font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', sans-serif; direction: rtl; -webkit-print-color-adjust: exact;">
      <!-- Outer Border Top & Sides -->
      <div style="position: absolute; top: 6mm; bottom: 0; left: 9mm; right: 9mm; border-top: 1.5px solid #1e293b; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; border-top-left-radius: 4px; border-top-right-radius: 4px;"></div>
      <!-- Inner Border Top & Sides -->
      <div style="position: absolute; top: 7.5mm; bottom: 0; left: 10.5mm; right: 10.5mm; border-top: 0.8px solid ${themeColor}; border-left: 0.8px solid ${themeColor}; border-right: 0.8px solid ${themeColor}; border-top-left-radius: 2px; border-top-right-radius: 2px;"></div>
      
      <!-- Running Header Bar inside the frame -->
      <div style="position: absolute; bottom: 2mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; border-bottom: 0.8px solid #e2e8f0; padding-bottom: 1.5mm;">
        <span style="color: ${themeColor}; font-weight: bold;">${showWatermark ? 'Qalam AI' : ''}</span>
        <span style="font-weight: bold; color: #0f172a;">${cleanTitle}</span>
        <span>کتابی نسخہ</span>
      </div>
    </div>
  `;

  const footerTemplate = `
    <style>
      * { box-sizing: border-box; }
    </style>
    <div style="width: 100%; height: 16mm; position: relative; font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', sans-serif; direction: rtl; -webkit-print-color-adjust: exact;">
      <!-- Outer Border Bottom & Sides -->
      <div style="position: absolute; top: 0; bottom: 6mm; left: 9mm; right: 9mm; border-bottom: 1.5px solid #1e293b; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;"></div>
      <!-- Inner Border Bottom & Sides -->
      <div style="position: absolute; top: 0; bottom: 7.5mm; left: 10.5mm; right: 10.5mm; border-bottom: 0.8px solid ${themeColor}; border-left: 0.8px solid ${themeColor}; border-right: 0.8px solid ${themeColor}; border-bottom-left-radius: 2px; border-bottom-right-radius: 2px;"></div>
      
      <!-- Running Footer Bar inside the frame -->
      <div style="position: absolute; top: 2mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; border-top: 0.8px solid #e2e8f0; padding-top: 1.5mm;">
        <span>${showWatermark ? 'Qalam AI' : ''}</span>
        <span style="font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 1px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
          صفحہ <span class="pageNumber"></span> / <span class="totalPages"></span>
        </span>
        <span>${cleanTitle}</span>
      </div>
    </div>
  `;

  const apiEndpoint = typeof window !== 'undefined'
    ? '/api/generate-pdf'
    : 'http://localhost:3000/api/generate-pdf';

  // Fetch standard binary PDF stream from server endpoint
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      htmlContent, 
      pageSize: params.pageSize || 'A4', 
      orientation: params.orientation || 'portrait',
      headerTemplate,
      footerTemplate,
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
 * If file sharing is not supported or restricted in iframe, provides graceful fallback.
 */
export async function shareBookPdf(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ success: boolean; fallbackTriggered: boolean; message: string }> {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdfFile = new File([blob], cleanFilename, { type: 'application/pdf' });

  let canShareFiles = false;
  try {
    canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [pdfFile] });
  } catch (e) {
    canShareFiles = false;
  }

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
        // User closed or dismissed native share sheet
        return {
          success: true,
          fallbackTriggered: false,
          message: '',
        };
      }
      console.warn('Web Share API file share encountered error:', err);
      // Fall through to graceful download fallback
    }
  }

  // Graceful Fallback: Trigger direct PDF file download so the user immediately receives the PDF file to share
  triggerPdfDownload(blob, cleanFilename);
  return {
    success: true,
    fallbackTriggered: true,
    message: 'براہِ راست شیئرنگ محدود تھی، اس لیے پی ڈی ایف فائل ڈاؤن لوڈ کر دی گئی ہے تا کہ آپ اسے خود شیئر کر سکیں۔',
  };
}
