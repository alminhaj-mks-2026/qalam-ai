import jsPDF from 'jspdf';
import { ChapterOutline, GeneratedBookData, CoverPageConfig } from '../types';

export interface BookPdfParams {
  title: string;
  subtitle: string;
  authorName: string;
  genre?: string;
  prefaceNote: string;
  conclusionNote: string;
  chapters: ChapterOutline[];
  rawText?: string;
  generatedBook?: GeneratedBookData | null;
  bodyFontSize?: number;
  pageSize?: 'A4' | 'A5' | 'Letter' | 'B5';
  orientation?: 'portrait' | 'landscape';
  autoLayout?: boolean;
  coverConfig?: CoverPageConfig;
}

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
        `${c.title}:${c.subheadings?.join(',')}:${c.sections?.map((s) => s.heading + s.content.length).join(',')}`
    )
    .join('|');

  const coverSig = params.coverConfig
    ? `${params.coverConfig.title}_${params.coverConfig.subtitle}_${params.coverConfig.authorName}_${params.coverConfig.additionalText}_${params.coverConfig.layout}_${params.coverConfig.alignment}_${params.coverConfig.themeColor}_${params.coverConfig.backgroundColor}_${params.coverConfig.showFrameBorder}_${params.coverConfig.logoUrl ? params.coverConfig.logoUrl.length : 0}`
    : 'default_cover';

  return `${params.title.trim()}_${params.subtitle.trim()}_${params.authorName.trim()}_${(params.prefaceNote || '').trim().length}_${(params.conclusionNote || '').trim().length}_${chapterSig}_${params.bodyFontSize || 17}_${params.pageSize || 'A4'}_${params.orientation || 'portrait'}_${params.autoLayout ? 'auto' : 'manual'}_${coverSig}`;
}

/**
 * Converts Hex Color string (e.g. #0F172A or #D4AF37) into RGB tuple [r, g, b]
 */
function hexToRgb(hex: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [15, 23, 42]; // default dark slate
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return [r, g, b];
  }
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Generates direct high-fidelity vector PDF using jsPDF without html2canvas or screenshots.
 * Handles custom cover pages, dynamic page numbering, TOC, and fast multi-page scaling.
 */
export async function createBookPdfBlob(
  params: BookPdfParams,
  forceRegenerate = false
): Promise<{ blob: Blob; filename: string }> {
  const currentHash = computeBookHash(params);

  // Return cached PDF instantly if available and unchanged
  if (!forceRegenerate && pdfBlobCache && pdfBlobCache.hash === currentHash) {
    return { blob: pdfBlobCache.blob, filename: pdfBlobCache.filename };
  }

  const pageSize = params.pageSize || 'A4';
  const orientation = params.orientation || 'portrait';
  const pdfFormat = pageSize === 'Letter' ? 'letter' : pageSize.toLowerCase();
  const pdfOrientation = orientation === 'landscape' ? 'l' : 'p';

  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: pdfFormat,
    compress: true,
  });

  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  // Typography Base Measurements
  let baseFontSizePt = params.bodyFontSize || 17;
  if (params.autoLayout) {
    if (pageSize === 'A5') baseFontSizePt = 14;
    else if (pageSize === 'B5') baseFontSizePt = 15;
    else baseFontSizePt = 16;
    if (orientation === 'landscape') baseFontSizePt += 1;
  }

  const marginX = orientation === 'landscape' ? 20 : 18;
  const marginTop = orientation === 'landscape' ? 18 : 20;
  const marginBottom = orientation === 'landscape' ? 18 : 20;
  const contentWidth = pw - marginX * 2;

  // Cover Page Configuration Fallbacks
  const cover: CoverPageConfig = params.coverConfig || {
    title: params.title || 'کتاب کا عنوان',
    subtitle: params.subtitle || 'ایک منظم اور مفصل مطالعہ',
    authorName: params.authorName || 'عبد الحفیظ',
    additionalText: 'AL-MINHAJ MKS / Qalam AI Edition',
    layout: 'royal_islamic',
    alignment: 'center',
    themeColor: '#D4AF37',
    backgroundColor: '#0F172A',
    showFrameBorder: true,
    isRtl: true,
  };

  const displayTitle = cover.title || params.title || 'کتاب کا عنوان';
  const displaySubtitle = cover.subtitle || params.subtitle || 'ایک منظم اور مفصل مطالعہ';
  const displayAuthor = cover.authorName || params.authorName || 'عبد الحفیظ';
  const displayAdditional = cover.additionalText || 'AL-MINHAJ MKS / Qalam AI Edition';

  // -------------------------------------------------------------
  // PAGE 1: CUSTOM PROFESSIONAL COVER PAGE
  // -------------------------------------------------------------
  const [bgR, bgG, bgB] = hexToRgb(cover.backgroundColor || '#0F172A');
  const [themeR, themeG, themeB] = hexToRgb(cover.themeColor || '#D4AF37');

  // Fill Background
  pdf.setFillColor(bgR, bgG, bgB);
  pdf.rect(0, 0, pw, ph, 'F');

  // Frame Border
  if (cover.showFrameBorder) {
    pdf.setDrawColor(themeR, themeG, themeB);
    pdf.setLineWidth(1.2);
    pdf.rect(6, 6, pw - 12, ph - 12, 'S');

    pdf.setLineWidth(0.3);
    pdf.rect(8.5, 8.5, pw - 17, ph - 17, 'S');
  }

  // Cover Page Content Alignment
  const align = cover.alignment || 'center';
  const textX = align === 'right' ? pw - marginX : align === 'left' ? marginX : pw / 2;

  let currentY = 32;

  // Optional Logo Image
  if (cover.logoUrl && cover.logoUrl.startsWith('data:image')) {
    try {
      const logoW = 24;
      const logoH = 24;
      const logoX = align === 'right' ? pw - marginX - logoW : align === 'left' ? marginX : (pw - logoW) / 2;
      pdf.addImage(cover.logoUrl, 'PNG', logoX, currentY, logoW, logoH);
      currentY += logoH + 12;
    } catch (e) {
      console.warn('Could not embed cover page logo image:', e);
    }
  }

  // Publisher / Additional Badge
  pdf.setTextColor(themeR, themeG, themeB);
  pdf.setFontSize(10);
  pdf.text(displayAdditional.toUpperCase(), textX, currentY, { align });
  currentY += 16;

  // Horizontal Accent Divider Line
  pdf.setDrawColor(themeR, themeG, themeB);
  pdf.setLineWidth(0.6);
  if (align === 'center') {
    pdf.line(pw / 2 - 25, currentY, pw / 2 + 25, currentY);
  } else if (align === 'right') {
    pdf.line(pw - marginX - 50, currentY, pw - marginX, currentY);
  } else {
    pdf.line(marginX, currentY, marginX + 50, currentY);
  }
  currentY += 18;

  // Cover Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(Math.max(22, Math.round(baseFontSizePt * 1.6)));

  const titleLines = pdf.splitTextToSize(displayTitle, contentWidth - 10);
  pdf.text(titleLines, textX, currentY, { align });
  currentY += titleLines.length * 12 + 8;

  // Cover Subtitle
  pdf.setTextColor(themeR, themeG, themeB);
  pdf.setFontSize(Math.max(12, Math.round(baseFontSizePt * 0.95)));
  const subtitleLines = pdf.splitTextToSize(displaySubtitle, contentWidth - 15);
  pdf.text(subtitleLines, textX, currentY, { align });

  // Cover Author (Bottom Section)
  const authorY = ph - 35;
  pdf.setDrawColor(themeR, themeG, themeB);
  pdf.setLineWidth(0.4);
  pdf.line(marginX, authorY - 12, pw - marginX, authorY - 12);

  pdf.setFontSize(9);
  pdf.setTextColor(themeR, themeG, themeB);
  pdf.text('مصنّف', textX, authorY - 5, { align });

  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text(displayAuthor, textX, authorY + 4, { align });

  // Helper function to add a standard internal book page
  let totalBookPages = 1;

  function addNewInternalPage(): number {
    pdf.addPage(pdfFormat, pdfOrientation);
    totalBookPages++;

    // Background
    pdf.setFillColor(251, 249, 245); // #FBF9F5
    pdf.rect(0, 0, pw, ph, 'F');

    // Page Border Line
    pdf.setDrawColor(203, 213, 225); // #CBD5E1
    pdf.setLineWidth(0.2);
    pdf.rect(8, 8, pw - 16, ph - 16, 'S');

    // Footer Page Number
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184); // #94A3B8
    pdf.text(`صفحہ ${totalBookPages - 1}`, pw / 2, ph - 12, { align: 'center' });

    return totalBookPages;
  }

  // -------------------------------------------------------------
  // PAGE 2: TITLE & PREFACE PAGE
  // -------------------------------------------------------------
  addNewInternalPage();
  currentY = marginTop + 6;

  // Publication Header
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('AL-MINHAJ MKS PUBLICATION', pw / 2, currentY, { align: 'center' });
  currentY += 8;

  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  const p2TitleLines = pdf.splitTextToSize(displayTitle, contentWidth);
  pdf.text(p2TitleLines, pw / 2, currentY, { align: 'center' });
  currentY += p2TitleLines.length * 8 + 4;

  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(displaySubtitle, pw / 2, currentY, { align: 'center' });
  currentY += 8;

  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.8);
  pdf.line(pw / 2 - 15, currentY, pw / 2 + 15, currentY);
  currentY += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`مصنف: ${displayAuthor}`, pw / 2, currentY, { align: 'center' });
  currentY += 16;

  // Preface Box if present
  if (params.prefaceNote && params.prefaceNote.trim()) {
    pdf.setFillColor(255, 251, 235); // amber-50
    pdf.setDrawColor(253, 230, 138); // amber-200
    pdf.setLineWidth(0.3);

    const prefaceTextLines = pdf.splitTextToSize(params.prefaceNote.trim(), contentWidth - 12);
    const boxHeight = prefaceTextLines.length * 6.5 + 18;

    pdf.rect(marginX, currentY, contentWidth, boxHeight, 'FD');

    pdf.setFontSize(11);
    pdf.setTextColor(120, 53, 15);
    pdf.text('دیباچہ و پیش لفظ:', pw - marginX - 6, currentY + 8, { align: 'right' });

    pdf.setFontSize(baseFontSizePt - 2);
    pdf.setTextColor(30, 41, 59);
    pdf.text(prefaceTextLines, pw - marginX - 6, currentY + 16, { align: 'right' });

    currentY += boxHeight + 12;
  }

  // -------------------------------------------------------------
  // PAGE 3: TABLE OF CONTENTS (TOC)
  // -------------------------------------------------------------
  addNewInternalPage();
  currentY = marginTop + 6;

  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text('فہرستِ مضامین', pw - marginX, currentY, { align: 'right' });
  currentY += 6;

  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.6);
  pdf.line(marginX, currentY, pw - marginX, currentY);
  currentY += 12;

  // TOC Item 1: Preface
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('دیباچہ و پیش لفظ', pw - marginX, currentY, { align: 'right' });
  pdf.text('صفحہ ۱', marginX, currentY, { align: 'left' });

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.line(marginX + 20, currentY + 1, pw - marginX - 35, currentY + 1);
  currentY += 10;

  // Chapter TOC Entries
  (params.chapters || []).forEach((chap, idx) => {
    if (currentY > ph - marginBottom - 15) {
      addNewInternalPage();
      currentY = marginTop + 10;
    }

    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    const tocTitle = chap.title || `باب ${idx + 1}`;
    pdf.text(tocTitle, pw - marginX, currentY, { align: 'right' });
    pdf.text(`صفحہ ${idx + 2}`, marginX, currentY, { align: 'left' });

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(marginX + 20, currentY + 1, pw - marginX - 45, currentY + 1);
    currentY += 7;

    if (chap.subheadings && chap.subheadings.length > 0) {
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      chap.subheadings.forEach((sub) => {
        pdf.text(`• ${sub}`, pw - marginX - 6, currentY, { align: 'right' });
        currentY += 5;
      });
    }

    currentY += 3;
  });

  // TOC Item Final: Conclusion
  if (currentY > ph - marginBottom - 15) {
    addNewInternalPage();
    currentY = marginTop + 10;
  }
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('اختتامیہ و حاصلِ کلام', pw - marginX, currentY, { align: 'right' });
  pdf.text(`صفحہ ${(params.chapters || []).length + 2}`, marginX, currentY, { align: 'left' });
  pdf.line(marginX + 20, currentY + 1, pw - marginX - 45, currentY + 1);
  currentY += 12;

  // -------------------------------------------------------------
  // CHAPTER PAGES (Pages 4+)
  // Optimized for fast vector rendering across 100/300/500/1000 pages
  // -------------------------------------------------------------
  const chapters = params.chapters || [];

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    addNewInternalPage();
    currentY = marginTop + 6;

    // Chapter Number Badge & Header Box
    pdf.setFontSize(9);
    pdf.setTextColor(212, 175, 55);
    pdf.text(`باب ${cIdx + 1}`, pw - marginX, currentY, { align: 'right' });
    currentY += 5;

    pdf.setFontSize(15);
    pdf.setTextColor(15, 23, 42);
    const chapTitleLines = pdf.splitTextToSize(chap.title || `باب ${cIdx + 1}`, contentWidth);
    pdf.text(chapTitleLines, pw - marginX, currentY, { align: 'right' });
    currentY += chapTitleLines.length * 8;

    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.8);
    pdf.line(marginX, currentY, pw - marginX, currentY);
    currentY += 10;

    // Chapter Summary
    if (chap.summary) {
      pdf.setFillColor(255, 251, 235);
      pdf.setDrawColor(253, 230, 138);
      pdf.setLineWidth(0.2);

      const summaryLines = pdf.splitTextToSize(`خلاصہ: ${chap.summary}`, contentWidth - 10);
      const summaryH = summaryLines.length * 5.5 + 8;

      pdf.rect(marginX, currentY, contentWidth, summaryH, 'FD');
      pdf.setFontSize(9);
      pdf.setTextColor(120, 53, 15);
      pdf.text(summaryLines, pw - marginX - 5, currentY + 6, { align: 'right' });
      currentY += summaryH + 8;
    }

    // Sections Render
    if (chap.sections && chap.sections.length > 0) {
      for (let sIdx = 0; sIdx < chap.sections.length; sIdx++) {
        const sec = chap.sections[sIdx];

        if (currentY > ph - marginBottom - 25) {
          addNewInternalPage();
          currentY = marginTop + 10;
        }

        // Section Heading
        pdf.setFillColor(241, 245, 249);
        pdf.rect(marginX, currentY, contentWidth, 8, 'F');

        pdf.setFillColor(212, 175, 55);
        pdf.rect(pw - marginX - 3, currentY, 3, 8, 'F');

        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(sec.heading || `عنوان ${sIdx + 1}`, pw - marginX - 6, currentY + 5.5, { align: 'right' });
        currentY += 12;

        // Section Body Content
        pdf.setFontSize(baseFontSizePt - 3);
        pdf.setTextColor(51, 65, 85);

        const bodyLines = pdf.splitTextToSize(sec.content || '', contentWidth - 4);
        const lineHeight = 6;

        for (let l = 0; l < bodyLines.length; l++) {
          if (currentY > ph - marginBottom - 12) {
            addNewInternalPage();
            currentY = marginTop + 10;
          }
          pdf.text(bodyLines[l], pw - marginX - 2, currentY, { align: 'right' });
          currentY += lineHeight;
        }

        currentY += 8;
      }
    } else {
      // Fallback Raw Content
      const fallbackText = params.rawText
        ? params.rawText.slice(cIdx * 600, (cIdx + 1) * 600)
        : 'اس باب میں تفصیلی مطالعہ اور تحقیقی مواد پیش کیا گیا ہے۔';

      pdf.setFontSize(baseFontSizePt - 3);
      pdf.setTextColor(51, 65, 85);
      const fallbackLines = pdf.splitTextToSize(fallbackText, contentWidth - 4);

      for (let l = 0; l < fallbackLines.length; l++) {
        if (currentY > ph - marginBottom - 12) {
          addNewInternalPage();
          currentY = marginTop + 10;
        }
        pdf.text(fallbackLines[l], pw - marginX - 2, currentY, { align: 'right' });
        currentY += 6;
      }
    }

    // Yield event loop every 50 pages if book is massive to prevent UI thread lock
    if (cIdx % 50 === 0 && cIdx > 0) {
      await new Promise((res) => setTimeout(res, 0));
    }
  }

  // -------------------------------------------------------------
  // FINAL PAGE: CONCLUSION PAGE
  // -------------------------------------------------------------
  addNewInternalPage();
  currentY = marginTop + 6;

  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text('اختتامیہ و حاصلِ کلام', pw / 2, currentY, { align: 'center' });
  currentY += 6;

  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.6);
  pdf.line(pw / 2 - 20, currentY, pw / 2 + 20, currentY);
  currentY += 14;

  const conclusionContent =
    params.conclusionNote && params.conclusionNote.trim()
      ? params.conclusionNote.trim()
      : 'اس کتاب کے تمام ابواب کا مطالعہ کرنے کے بعد یہ بات واضح ہو جاتی ہے کہ منظم انداز میں پیش کیا گیا مواد قاری کی سوچ میں حقیقی تبدیلی لاتا ہے۔';

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);

  const concLines = pdf.splitTextToSize(conclusionContent, contentWidth - 12);
  const concBoxH = concLines.length * 6.5 + 16;

  pdf.rect(marginX, currentY, contentWidth, concBoxH, 'FD');

  pdf.setFontSize(baseFontSizePt - 2);
  pdf.setTextColor(30, 41, 59);
  pdf.text(concLines, pw - marginX - 6, currentY + 12, { align: 'right' });

  currentY += concBoxH + 16;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('امید ہے کہ یہ تصنیف آپ کے لیے علمی اور عملی میدان میں مفید ثابت ہوگی۔', pw / 2, currentY, { align: 'center' });

  // Output generated Blob
  const blob = pdf.output('blob');
  const safeTitle = (params.title || 'Qalam-AI-Book')
    .replace(/[^\w\s\u0600-\u06FF-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const filename = `${safeTitle || 'Qalam-AI-Book'}.pdf`;

  // Cache generated PDF Blob & Hash Signature
  pdfBlobCache = { hash: currentHash, blob, filename };

  return { blob, filename };
}

/**
 * Triggers direct browser download of the PDF blob. Reuses cached Blob.
 */
export function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
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
 * Reuses the exact same PDF Blob and falls back gracefully to download if unsupported.
 */
export async function shareBookPdf(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ success: boolean; fallbackTriggered: boolean; message: string }> {
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    !!navigator.canShare &&
    navigator.canShare({ files: [pdfFile] });

  if (canShareFiles) {
    try {
      await navigator.share({
        title: title || 'Qalam AI Book',
        text: `${title || 'Qalam AI Book'} - Qalam AI کے ذریعے مرتب کی گئی مکمل کتاب`,
        files: [pdfFile],
      });
      return {
        success: true,
        fallbackTriggered: false,
        message: 'پی ڈی ایف فائل کامیابی سے شیئر کر دی گئی ہے!',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: true,
          fallbackTriggered: false,
          message: '',
        };
      }
      console.warn('Web Share API file share failed or canceled, triggering download fallback:', err);
    }
  }

  // Fallback: Download file directly and alert user with clear Urdu message
  triggerPdfDownload(blob, filename);
  return {
    success: true,
    fallbackTriggered: true,
    message: 'آپ کے براؤزر میں برائے راست فائل شیئرنگ کا فنکشن دستیاب نہیں ہے۔ اصل پی ڈی ایف فائل ڈاؤن لوڈ کر دی گئی ہے تا کہ آپ اسے اپنے ڈیوائس سے شیئر کر سکیں۔',
  };
}
