import { ChapterOutline, GeneratedBookData, CoverPageConfig, BookPdfParams } from '../types';

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
        `${c.title}:${c.sections?.map((s) => s.heading + (s.content ? s.content.length : 0)).join(',')}`
    )
    .join('|');

  const coverSig = params.coverConfig
    ? `${params.coverConfig.title}_${params.coverConfig.subtitle}_${params.coverConfig.authorName}_${params.coverConfig.layout}_${params.coverConfig.themeColor}_${params.coverConfig.backgroundColor}_${params.coverConfig.alignment}`
    : 'default_cover';

  return `${params.title}_${params.subtitle}_${params.authorName}_${chapterSig}_${params.bodyFontSize || 16}_${params.pageSize || 'A4'}_${params.orientation || 'portrait'}_${coverSig}_${params.prefaceNote?.length || 0}_${params.conclusionNote?.length || 0}`;
}

/**
 * Generates direct high-fidelity vector PDF using Puppeteer on the server.
 * Completely standard, unencrypted PDF with embedded fonts for Urdu, Arabic, and English.
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

  const cleanTitle = (params.title || 'کتاب').trim();
  const cleanSubtitle = (params.subtitle || '').trim();
  const cleanAuthor = (params.authorName || 'عبد الحفیظ').trim();
  const coverBg = params.coverConfig?.backgroundColor || '#0F172A';
  const themeColor = params.coverConfig?.themeColor || '#D4AF37';
  const textAlign = params.coverConfig?.alignment || 'center';

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
      line-height: 2.3;
      color: #0f172a;
      background: white;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
    }

    @page {
      size: ${params.pageSize || 'A4'} ${params.orientation || 'portrait'};
      margin: 20mm 15mm;
    }

    .page {
      page-break-after: always;
      position: relative;
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
    }

    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
      text-align: ${textAlign};
      height: 100vh;
      padding: 60px 40px;
      background-color: ${coverBg};
      color: white;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    ${params.coverConfig?.showFrameBorder ? `
    .cover-frame {
      position: absolute;
      top: 20px;
      bottom: 20px;
      left: 20px;
      right: 20px;
      border: 2px solid ${themeColor}60;
      border-radius: 12px;
      pointer-events: none;
    }
    ` : ''}

    .cover-top {
      margin-top: 10%;
      width: 100%;
    }

    .cover-edition {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${themeColor};
      margin-bottom: 25px;
      font-weight: bold;
    }

    .cover-title {
      font-size: 44px;
      font-weight: bold;
      line-height: 1.5;
      margin-bottom: 20px;
      color: #ffffff;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .cover-subtitle {
      font-size: 22px;
      color: ${themeColor};
      margin-top: 15px;
      line-height: 1.6;
    }

    .cover-bottom {
      margin-bottom: 8%;
      width: 100%;
      border-top: 1px solid ${themeColor}40;
      padding-top: 20px;
    }

    .cover-author-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${themeColor};
      margin-bottom: 6px;
    }

    .cover-author {
      font-size: 26px;
      font-weight: bold;
      color: #ffffff;
    }

    /* Content Pages */
    .content-page {
      padding: 10mm 5mm;
    }

    .chapter-badge {
      color: ${themeColor};
      font-weight: bold;
      font-size: 15px;
      text-align: center;
      margin-bottom: 8px;
    }

    .chapter-title {
      font-size: 30px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid ${themeColor};
      margin-bottom: 30px;
      padding-bottom: 12px;
      text-align: center;
      line-height: 1.5;
    }

    .section-title {
      font-size: 22px;
      font-weight: bold;
      color: #1e293b;
      margin-top: 35px;
      margin-bottom: 15px;
      background: #f8fafc;
      padding: 10px 20px;
      border-right: 6px solid ${themeColor};
      border-radius: 6px;
      line-height: 1.4;
    }

    .body-text {
      font-size: ${params.bodyFontSize || 17}px;
      text-align: justify;
      margin-bottom: 20px;
      white-space: pre-line;
      color: #334155;
      line-height: 2.3;
    }

    .summary-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 25px;
      color: #78350f;
      font-size: ${Math.max(13, (params.bodyFontSize || 17) - 2)}px;
      line-height: 2.1;
    }

    /* Table of Contents */
    .toc-title {
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 35px;
      color: #0f172a;
      border-bottom: 2px solid ${themeColor};
      padding-bottom: 10px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px dotted #cbd5e1;
      padding: 12px 0;
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
    }

    .toc-page {
      font-family: monospace;
      color: #64748b;
      font-weight: bold;
      font-size: 15px;
    }

    .page-footer {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 15px;
      margin-top: 30px;
    }
  </style>
</head>
<body dir="rtl">
  <!-- 1. Cover Page -->
  <div class="page cover-page">
    ${params.coverConfig?.showFrameBorder ? '<div class="cover-frame"></div>' : ''}
    <div class="cover-top">
       ${params.coverConfig?.logoUrl ? `<img src="${params.coverConfig.logoUrl}" style="max-height: 80px; margin-bottom: 20px; border-radius: 8px;">` : ''}
       <div class="cover-edition">${params.coverConfig?.additionalText || 'AL-MINHAJ MKS / Qalam AI Edition'}</div>
       <div class="cover-title">${cleanTitle}</div>
       ${cleanSubtitle ? `<div class="cover-subtitle">${cleanSubtitle}</div>` : ''}
    </div>
    <div class="cover-bottom">
       <div class="cover-author-label">مصنّف</div>
       <div class="cover-author">${cleanAuthor}</div>
    </div>
  </div>

  <!-- 2. Table of Contents Page -->
  <div class="page content-page">
    <div class="toc-title">فہرستِ مضامین</div>
    <div class="toc-item">
      <span>پیش لفظ و دیباچہ</span>
      <span class="toc-page">۱</span>
    </div>
    ${params.chapters.map((ch, idx) => `
      <div class="toc-item">
        <span>${ch.title}</span>
        <span class="toc-page">${idx + 2}</span>
      </div>
    `).join('')}
    <div class="toc-item">
      <span>حاصلِ کلام و اختتامیہ</span>
      <span class="toc-page">${params.chapters.length + 2}</span>
    </div>
    <div class="page-footer">AL-MINHAJ MKS — فہرستِ مضامین</div>
  </div>

  <!-- 3. Preface Page -->
  <div class="page content-page">
    <div class="chapter-badge">پیش لفظ</div>
    <div class="chapter-title">دیباچہ و تعارفِ کتاب</div>
    <div class="body-text">${params.prefaceNote || 'اس کتاب میں پیش کردہ تمام مضامین کو علمی، مستند اور منظم انداز میں ترتیب دیا گیا ہے۔'}</div>
    <div class="page-footer">صفحہ ۱ · دیباچہ</div>
  </div>

  <!-- 4. Chapter Pages -->
  ${params.chapters.map((ch, idx) => `
    <div class="page content-page">
      <div class="chapter-badge">باب ${idx + 1}</div>
      <div class="chapter-title">${ch.title}</div>
      
      ${ch.summary ? `
        <div class="summary-box">
          <strong>خلاصۂ باب: </strong>${ch.summary}
        </div>
      ` : ''}

      ${ch.sections && ch.sections.length > 0 ? ch.sections.map(sec => `
        <div class="section-title">${sec.heading}</div>
        <div class="body-text">${sec.content}</div>
      `).join('') : `
        <div class="body-text">${params.rawText ? params.rawText.slice(idx * 500, (idx + 1) * 500) : 'اس باب کے تحت تفصیلی علمی مباحث پیش کیے گئے ہیں۔'}</div>
      `}
      <div class="page-footer">صفحہ ${idx + 2} · ${cleanTitle}</div>
    </div>
  `).join('')}

  <!-- 5. Conclusion Page -->
  <div class="page content-page">
    <div class="chapter-badge">اختتامیہ</div>
    <div class="chapter-title">حاصلِ کلام و تجاویز</div>
    <div class="body-text">${params.conclusionNote || 'حاصلِ کلام یہ ہے کہ منظم تدوین اور مسلسل محنت سے ہی علم پائیدار اثر پیدا کرتا ہے۔'}</div>
    <div class="page-footer">صفحہ ${params.chapters.length + 2} · اختتامیہ</div>
  </div>
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
        text: `${title || 'Qalam AI Book'} - AL-MINHAJ MKS`,
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
  // DO NOT pretend sharing succeeded or silently download.
  return {
    success: false,
    fallbackTriggered: false,
    message: 'آپ کے اس براؤزر میں برائے راست فائل شیئرنگ (Web Share API for Files) کی سہولت موجود نہیں ہے۔ براہِ کرم "⬇️ PDF حاصل کریں" کا بٹن دبا کر فائل ڈاؤن لوڈ کریں اور خود واٹس ایپ یا دیگر ایپس پر شیئر کریں۔',
  };
}
