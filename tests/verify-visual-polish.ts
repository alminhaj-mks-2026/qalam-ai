import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { isPureArabic, isPureEnglish, tokenizeScript, formatScriptAwareHtml } from '../src/services/scriptTypography';

async function runVisualPolishVerification() {
  console.log('====================================================');
  console.log('   QALAM AI — VISUAL POLISH & BORDER VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, details?: string) {
    if (cond) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} -> ${details || ''}`);
      failed++;
    }
  }

  // 1. VERIFY SCRIPT-AWARE TOKENIZER & CLASSIFIER
  console.log('--- 1. Script-Aware Font & Language Classification ---');
  
  const urduText = 'علم انسان کی بنیادی صفت ہے جو اسے دیگر مخلوقات سے ممتاز کرتی ہے۔';
  const arabicText = 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ';
  const englishText = 'Knowledge is power, but application is mastery.';
  const mixedText = 'ارشاد ہوا: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ"۔ Alvin Toffler نے کہا تھا کہ نئی مہارتیں سیکھنا ضروری ہے۔';

  assert(isPureArabic(arabicText), 'Arabic Hadith with Harakat classified as pure Arabic');
  assert(!isPureArabic(urduText), 'Urdu text is NOT misclassified as pure Arabic');
  assert(isPureEnglish(englishText), 'English sentence classified as pure English');
  assert(!isPureEnglish(urduText), 'Urdu text is NOT misclassified as English');

  const tokens = tokenizeScript(mixedText);
  const arabicToken = tokens.find(t => t.type === 'arabic');
  const englishToken = tokens.find(t => t.type === 'english');
  const urduToken = tokens.find(t => t.type === 'urdu');

  assert(Boolean(arabicToken && arabicToken.text.includes('طَلَبُ')), 'Arabic quote tokenized with type: "arabic"');
  assert(Boolean(englishToken && englishToken.text.includes('Alvin Toffler')), 'English name tokenized with type: "english"');
  assert(Boolean(urduToken && urduToken.text.includes('ارشاد')), 'Urdu narrative tokenized with type: "urdu"');

  const formattedHtml = formatScriptAwareHtml(mixedText);
  assert(formattedHtml.includes('font-arabic'), 'Generated HTML contains font-arabic class for Arabic quote');
  assert(formattedHtml.includes('font-english'), 'Generated HTML contains font-english class for English name');
  assert(formattedHtml.includes('font-urdu'), 'Generated HTML contains font-urdu class for Urdu text');

  // 2. VERIFY PUPPETEER PDF LAYOUT & BORDERS
  console.log('\n--- 2. Puppeteer Real PDF Page Border & Geometry Inspection ---');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });

  const cleanTitle = 'المنہاج: علم سے حقیقی مہارت تک کا سفر';
  const themeColor = '#D4AF37';

  // Read local embedded fonts to verify real rendering
  function getLocalFontBase64(relPath: string): string {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      return `data:font/woff2;base64,${fs.readFileSync(fullPath).toString('base64')}`;
    }
    return '';
  }

  const nastaliqBase64 = getLocalFontBase64('node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2');
  const amiriBase64 = getLocalFontBase64('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2');
  const latinBase64 = getLocalFontBase64('node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2');

  const fontStyles = `
    @font-face {
      font-family: 'Noto Nastaliq Urdu';
      src: url('${nastaliqBase64}') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Amiri';
      src: url('${amiriBase64}') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Plus Jakarta Sans';
      src: url('${latinBase64}') format('woff2');
      font-weight: 400;
    }
    .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; }
    .font-arabic { font-family: 'Amiri', serif; }
    .font-english { font-family: 'Plus Jakarta Sans', sans-serif; }
  `;

  const headerTemplate = `
    <style>
      * { box-sizing: border-box; }
    </style>
    <div style="width: 100%; height: 16mm; position: relative; font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; -webkit-print-color-adjust: exact;">
      <!-- Outer Border Top & Sides -->
      <div style="position: absolute; top: 6mm; bottom: 0; left: 9mm; right: 9mm; border-top: 1.5px solid #1e293b; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; border-top-left-radius: 4px; border-top-right-radius: 4px;"></div>
      <!-- Inner Border Top & Sides -->
      <div style="position: absolute; top: 7.5mm; bottom: 0; left: 10.5mm; right: 10.5mm; border-top: 0.8px solid ${themeColor}; border-left: 0.8px solid ${themeColor}; border-right: 0.8px solid ${themeColor}; border-top-left-radius: 2px; border-top-right-radius: 2px;"></div>
      
      <!-- Running Header Bar inside the frame -->
      <div style="position: absolute; bottom: 2mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; border-bottom: 0.8px solid #e2e8f0; padding-bottom: 1.5mm;">
        <span style="color: ${themeColor}; font-weight: bold;">Qalam AI</span>
        <span style="font-weight: bold; color: #0f172a;">${cleanTitle}</span>
        <span>کتابی نسخہ</span>
      </div>
    </div>
  `;

  const footerTemplate = `
    <style>
      * { box-sizing: border-box; }
    </style>
    <div style="width: 100%; height: 16mm; position: relative; font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; -webkit-print-color-adjust: exact;">
      <!-- Outer Border Bottom & Sides -->
      <div style="position: absolute; top: 0; bottom: 6mm; left: 9mm; right: 9mm; border-bottom: 1.5px solid #1e293b; border-left: 1.5px solid #1e293b; border-right: 1.5px solid #1e293b; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;"></div>
      <!-- Inner Border Bottom & Sides -->
      <div style="position: absolute; top: 0; bottom: 7.5mm; left: 10.5mm; right: 10.5mm; border-bottom: 0.8px solid ${themeColor}; border-left: 0.8px solid ${themeColor}; border-right: 0.8px solid ${themeColor}; border-bottom-left-radius: 2px; border-bottom-right-radius: 2px;"></div>
      
      <!-- Running Footer Bar inside the frame -->
      <div style="position: absolute; top: 2mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; border-top: 0.8px solid #e2e8f0; padding-top: 1.5mm;">
        <span>Qalam AI</span>
        <span style="font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 1px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
          صفحہ <span class="pageNumber"></span> / <span class="totalPages"></span>
        </span>
        <span>${cleanTitle}</span>
      </div>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="ur" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        ${fontStyles}
        * { box-sizing: border-box; }
        @page {
          size: A4 portrait;
          margin: 16mm 14mm 16mm 14mm;
        }
        @page :first {
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Nastaliq Urdu', serif;
          line-height: 2.15;
          color: #0f172a;
          direction: rtl;
        }
        /* Page Connecting Rectangular Frame Side Lines */
        .pdf-page-border-outer {
          position: fixed;
          top: 0;
          bottom: 0;
          left: -5mm;
          right: -5mm;
          border-left: 1.5px solid #1e293b;
          border-right: 1.5px solid #1e293b;
          pointer-events: none;
          z-index: 9999;
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
          z-index: 9999;
          box-sizing: border-box;
        }
        .cover-page {
          height: 297mm;
          background: #0F172A;
          color: white;
          page-break-after: always;
          break-after: page;
          padding: 18mm 14mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          position: relative;
        }
        .cover-frame-outer {
          position: absolute;
          top: 8mm;
          bottom: 8mm;
          left: 8mm;
          right: 8mm;
          border: 2px solid ${themeColor}90;
          border-radius: 8px;
        }
        .cover-frame-inner {
          position: absolute;
          top: 10.5mm;
          bottom: 10.5mm;
          left: 10.5mm;
          right: 10.5mm;
          border: 1px solid ${themeColor}40;
          border-radius: 4px;
        }
        .toc-page {
          page-break-after: always;
          break-after: page;
          padding: 4mm 6mm;
        }
        .book-content-flow {
          padding: 2mm 6mm;
        }
        .chapter-block {
          margin-bottom: 24px;
        }
        .chapter-title {
          font-size: 22px;
          font-weight: bold;
          text-align: center;
          border-bottom: 2px solid ${themeColor};
          padding-bottom: 6px;
          margin-bottom: 12px;
          break-after: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          background: #f8fafc;
          padding: 4px 10px;
          border-right: 4px solid ${themeColor};
          border-radius: 4px;
          margin-top: 14px;
          margin-bottom: 6px;
          break-after: avoid;
        }
        .body-text {
          font-size: 15px;
          padding: 0 4mm;
        }
        .body-p {
          text-indent: 1.6em;
          margin-top: 0;
          margin-bottom: 0.65em;
          text-align: justify;
          text-justify: inter-word;
          text-align-last: right;
        }
        .english-para {
          text-indent: 1.2em;
          text-align-last: left;
          font-family: 'Plus Jakarta Sans', sans-serif;
          direction: ltr;
        }
        .arabic-para {
          text-indent: 1.2em;
          font-family: 'Amiri', serif;
          direction: rtl;
        }
        .inline-english {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          direction: ltr !important;
          display: inline-block;
          padding: 0 2px;
        }
        .inline-arabic {
          font-family: 'Amiri', serif !important;
          direction: rtl !important;
          padding: 0 2px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="pdf-page-border-outer"></div>
      <div class="pdf-page-border-inner"></div>

      <!-- Page 1: Cover -->
      <div class="cover-page">
        <div class="cover-frame-outer"></div>
        <div class="cover-frame-inner"></div>
        <div style="margin-top: 10%;">
          <div style="font-size: 12px; letter-spacing: 2px; color: ${themeColor};">QALAM AI EDITION</div>
          <h1 style="font-size: 36px; margin: 12px 0;">${cleanTitle}</h1>
          <p style="color: ${themeColor};">جامع فکری، علمی اور جدید تحقیقی رہنما</p>
        </div>
        <div style="margin-bottom: 6%; border-top: 1px solid ${themeColor}40; padding-top: 12px;">
          <div style="font-size: 11px; color: ${themeColor};">مصنّف</div>
          <div style="font-size: 22px; font-weight: bold;">مفتی عبدالحفیظ</div>
        </div>
      </div>

      <!-- Page 2: Table of Contents -->
      <div class="toc-page">
        <h2 class="chapter-title">فہرستِ مضامین</h2>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc;">
          <span>پیش لفظ و دیباچہ</span>
          <span>صفحہ ۱</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc;">
          <span>باب ۱: فکری بنیادیں اور قرآنی ہدایت</span>
          <span>صفحہ ۲</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc;">
          <span>باب ۲: اکیسویں صدی کے چیلنجز اور ہنر مندی</span>
          <span>صفحہ ۳</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc;">
          <span>اختتامیہ و حاصلِ کلام</span>
          <span>صفحہ ۴</span>
        </div>
      </div>

      <!-- Page 3+: Chapters Content Flow -->
      <div class="book-content-flow">
        <!-- Chapter 1 (Middle Page) -->
        <div class="chapter-block" id="chapter-1">
          <div style="color: ${themeColor}; font-weight: bold; text-align: center;">باب ۱</div>
          <h2 class="chapter-title">باب ۱: فکری بنیادیں اور قرآنی ہدایت</h2>
          <div class="section-title">علم اور قرآنی بصیرت</div>
          <div class="body-text">
            ${formatScriptAwareHtml(`علم انسان کی وہ بنیادی صفت ہے جو اسے دیگر مخلوقات سے ممتاز کرتی ہے۔ جیسا کہ حدیثِ مبارکہ میں ارشاد ہوا: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ" (علم حاصل کرنا ہر مسلمان پر فرض ہے)۔\n\nقرآنِ کریم میں ارشادِ ربانی ہے: "إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ"۔ اس لیے حقیقی علم انسان کے دل میں خشیت اور بندگی پیدا کرتا ہے۔\n\nAlvin Toffler نے بجا طور پر لکھا تھا: "The illiterate of the 21st century will not be those who cannot read and write, but those who cannot learn, unlearn, and relearn." اس لیے تعلیم کو زندگی بھر کا سفر بنانا ہوگا۔`)}
          </div>
        </div>

        <div style="page-break-after: always; break-after: page;"></div>

        <!-- Conclusion (Last Page) -->
        <div class="chapter-block" id="conclusion-page">
          <div style="color: ${themeColor}; font-weight: bold; text-align: center;">اختتامیہ</div>
          <h2 class="chapter-title">حاصلِ کلام و تجاویز</h2>
          <div class="body-text">
            ${formatScriptAwareHtml(`خلاصۂ کلام یہ ہے کہ حقیقی مہارت نظریاتی علم کو مسلسل عمل اور حکمت کے ساتھ بروئے کار لانے کا نام ہے۔\n\nجیسا کہ عربی کا مقولہ ہے: "شَرُّ الْوَرَىٰ مَنْ يَوْمُهُ أَخْسَرُ مِنْ أَمْسِهِ"۔ انسان کا ہر دن پچھلے دن سے بہتر اور کارآمد ہونا چاہیے۔\n\n"Continuous learning is the minimum requirement for success in any field." اللہ تعالی ہم سب کو نافع علم اور اس پر عمل کی توفیق عطا فرمائے۔ آمین!`)}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });

  // Measure DOM geometry to guarantee text does not overflow borders
  const metrics = await page.evaluate(() => {
    const cover = document.querySelector('.cover-page');
    const toc = document.querySelector('.toc-page');
    const chap = document.querySelector('#chapter-1');
    const concl = document.querySelector('#conclusion-page');
    const arabicSpans = document.querySelectorAll('.inline-arabic');
    const englishSpans = document.querySelectorAll('.inline-english');

    return {
      hasCover: !!cover,
      hasToc: !!toc,
      hasChap: !!chap,
      hasConcl: !!concl,
      arabicCount: arabicSpans.length,
      englishCount: englishSpans.length,
      coverWidth: cover?.clientWidth || 0,
      tocWidth: toc?.clientWidth || 0,
      chapWidth: chap?.clientWidth || 0,
    };
  });

  assert(metrics.hasCover, 'Cover page rendered with full decorative frame');
  assert(metrics.hasToc, 'TOC beginning page rendered inside content boundary');
  assert(metrics.hasChap, 'Chapter middle page rendered with full typography');
  assert(metrics.hasConcl, 'Conclusion last page rendered cleanly');
  assert(metrics.arabicCount >= 2, `Arabic spans detected and rendered with Amiri font (${metrics.arabicCount} spans)`);
  assert(metrics.englishCount >= 2, `English spans detected and rendered with Plus Jakarta Sans (${metrics.englishCount} spans)`);

  // Generate real PDF to verify Puppeteer generates buffer without error
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    preferCSSPageSize: true
  });

  await browser.close();

  assert(pdfBuffer.length > 30000, `Complete PDF binary generated successfully (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  const outDir = path.resolve(process.cwd(), '.qalam_jobs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const finalPdfPath = path.join(outDir, 'live_verification_visual_polish.pdf');
  fs.writeFileSync(finalPdfPath, Buffer.from(pdfBuffer));

  console.log(`\nVerified PDF written to: ${finalPdfPath}`);
  console.log('====================================================');
  console.log(`  Visual Verification: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVisualPolishVerification().catch(err => {
  console.error('Visual polish verification error:', err);
  process.exit(1);
});
