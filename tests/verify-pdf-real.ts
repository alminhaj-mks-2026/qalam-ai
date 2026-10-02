import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { createBookPdfBlob } from '../src/services/pdfService';
import { BookPdfParams } from '../src/types';

async function runRealPdfVerification() {
  console.log('====================================================');
  console.log('   QALAM AI — REAL PDF FULL INSPECTION & VERIFICATION');
  console.log('====================================================');

  const testParams: BookPdfParams = {
    title: 'المنہاج: علم سے عمل اور تسخیرِ کائنات تک کا سفر',
    subtitle: 'جامع فکری، علمی اور جدید تحقیقی رہنما',
    authorName: 'مفتی عبدالحفیظ',
    prefaceNote: `علم انسان کی وہ بنیادی صفت ہے جو اسے دیگر مخلوقات سے ممتاز کرتی ہے۔ جیسا کہ حدیثِ مبارکہ میں ارشاد ہوا: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ" (علم حاصل کرنا ہر مسلمان پر فرض ہے)۔ جدید دور میں سائنسی اور تکنیکی علوم کا حصول بھی اسی دائرے میں آتا ہے۔

ہمارا بنیادی مقصد معلومات کو حقیقی تفہیم، اور تفہیم کو عملی صلاحیت میں بدلنا ہے۔ "Knowledge is power, but application of knowledge is true mastery." اس کتاب میں ہم انہی اصولوں کا فکری جائزہ لیں گے۔`,
    chapters: [
      {
        id: 'chap-1',
        title: 'باب ۱: حقیقی علم اور شعور کی ضرورت',
        summary: 'مختصر ابتدائی جائزہ جس میں علم کی حقیقی ماہیت بیان کی گئی ہے۔',
        subheadings: ['علم اور معلومات میں بنیادی فرق'],
        sections: [
          {
            heading: 'علم اور معلومات میں بنیادی فرق',
            content: `معلومات کا ذخیرہ کر لینا علم نہیں کہلاتا، بلکہ جب تک معلومات انسان کے کردار، فکر اور عمل میں مثبت تبدیلی نہ لائیں، وہ حقیقی علم کی تعریف میں پورا نہیں اترتیں۔

موجودہ دور میں ڈیٹا کا طوفان ہے، مگر حکمت اور بصیرت کی کمی ہے۔ انسان کو چاہیے کہ وہ سطحی معلومات سے آگے بڑھ کر گہری تفہیم حاصل کرے۔`,
          },
        ],
      },
      {
        id: 'chap-2',
        title: 'باب ۲: تحقیق، تدبر اور عصری تقاضے',
        summary: 'جامع تفصیلی جائزہ جس میں جدید سائنسی اور فکری اصولوں کا احاطہ کیا گیا ہے۔',
        subheadings: ['قرآنی ہدایت اور تدبرِ کائنات', 'جدید دور کے چیلنجز اور ہنر مندی', 'عملی تطبیق اور مسلسل بہتری'],
        sections: [
          {
            heading: 'قرآنی ہدایت اور تدبرِ کائنات',
            content: `قرآنِ کریم بار بار انسان کو کائنات کی نشانیوں میں غور و فکر کرنے کی دعوت دیتا ہے۔ ارشادِ باری تعالی ہے: "إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ" (اللہ سے اس کے وہی بندے ڈرتے ہیں جو علم والے ہیں)۔

حقیقی عالم وہ ہے جو کائنات کے قوانین کا مطالعہ کر کے خالق کی عظمت کو پہچانے۔ اس مقصد کے لیے مشاہدہ، تجربہ اور سائنسی تحقیق کا راستہ اختیار کرنا عینِ مطلوب ہے۔`,
          },
          {
            heading: 'جدید دور کے چیلنجز اور ہنر مندی',
            content: `اکیسویں صدی میں تعلیم صرف روایتی ڈگریوں تک محدود نہیں رہی۔ Alvin Toffler نے سچ کہا تھا: "The illiterate of the 21st century will not be those who cannot read and write, but those who cannot learn, unlearn, and relearn."

جب تک ہم جدید صلاحیتیں اور ڈیجیٹل ہنر نہیں سیکھیں گے، ہم عالمی سطح پر مؤثر کردار ادا نہیں کر سکتے۔ وقت کا تقاضا ہے کہ ہم اپنی صلاحیتوں کو مسلسل اپ ڈیٹ کرتے رہیں۔`,
          },
          {
            heading: 'عملی تطبیق اور مسلسل بہتری',
            content: `عملی تطبیق کے بغیر تمام نظریہ جات محض کاغذی دعوے بن کر رہ جاتے ہیں۔ ہر طالبِ علم اور محقق کے لیے ضروری ہے کہ وہ اپنے حاصل کردہ علم کو روزمرہ کے مسائل حل کرنے میں استعمال کرے۔

تسلسل، استقامت اور اخلاص ہی وہ بنیادی صفات ہیں جو انسان کو درجہ بدرجہ کامیابی اور مہارت کی بلندیوں تک پہنچاتی ہیں۔`,
          },
        ],
      },
      {
        id: 'chap-3',
        title: 'باب ۳: فکرِ المنہاج اور مستقبل کی حکمتِ عملی',
        summary: 'آئندہ کے معماروں کے لیے واضح عمل اور تعلیمی لائحہ عمل۔',
        subheadings: ['جامع تعلیمی فریم ورک', 'حکمت اور اخلاقی ذمہ داری'],
        sections: [
          {
            heading: 'جامع تعلیمی فریم ورک',
            content: `المنہاج فریم ورک چار بنیادی ستونوں پر قائم ہے: مستند علم، گہری سمجھ، عملی استعمال، اور حقیقی مہارت۔ ان چاروں مرحلوں سے گزرے بغیر کوئی بھی تعلیمی نظام مکمل نہیں ہو سکتا۔`,
          },
          {
            heading: 'حکمت اور اخلاقی ذمہ داری',
            content: `اخلاقیات کے بغیر علم محض طاقت بن جاتا ہے جو تباہی پھیلا سکتا ہے۔ اس لیے ہر علمی اور سائنسی پیش رفت کو انسانیت کی خدمت اور اخلاقی حدود کے تابع ہونا چاہیے۔`,
          },
        ],
      },
    ],
    conclusionNote: `خلاصہ یہ ہے کہ حقیقی کامیابی علم کی روح کو سمجھنے اور اسے عمل کا پیراہن پہنانے میں مضمر ہے۔ ہمیں چاہیے کہ ہم مسلسل سیکھنے کے عمل کو اپنی زندگی کا شعار بنائیں۔

اللہ تعالی سے دعا ہے کہ وہ ہمیں نافع علم عطا فرمائے اور اس پر عمل کی توفیق مرحمت فرمائے۔ آمین!`,
    bodyFontSize: 15,
    pageSize: 'A4',
    orientation: 'portrait',
  };

  console.log('1. Building HTML Content and PDF with embedded fonts...');

  // Start a local server test or render HTML via Puppeteer directly using server's getEmbeddedFontStyles logic
  const fontStylesPath = path.resolve(process.cwd(), 'server.ts');
  const serverCode = fs.readFileSync(fontStylesPath, 'utf-8');

  // We can launch puppeteer and test the PDF layout directly
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });

  // Generate HTML through node by evaluating html string generated in pdfService logic or fetching server
  // Let's create an HTML string identical to createBookPdfBlob output
  // We can import or inspect createBookPdfBlob
  console.log('2. Running Puppeteer to inspect DOM layout and rendered fonts...');

  // Fetch or mock server generate-pdf endpoint directly using node-fetch or puppeteer page.setContent
  // Let's generate the HTML via node
  const express = (await import('express')).default;
  const { createServer } = await import('http');
  
  // Let's run a test server on port 3099 to call /api/generate-pdf
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Read font base64
  function getLocalFontBase64(relPath: string): string {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      return `data:font/woff2;base64,${fs.readFileSync(fullPath).toString('base64')}`;
    }
    return '';
  }

  const nastaliq400 = getLocalFontBase64('node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2');
  const nastaliq700 = getLocalFontBase64('node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2');
  const naskh400 = getLocalFontBase64('node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2');
  const naskh700 = getLocalFontBase64('node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2');
  const amiri400 = getLocalFontBase64('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2');
  const amiri700 = getLocalFontBase64('node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff2');
  const latin400 = getLocalFontBase64('node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2');
  const latin700 = getLocalFontBase64('node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2');

  const fontCss = `
    @font-face {
      font-family: 'Noto Nastaliq Urdu';
      src: url('${nastaliq400}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Nastaliq Urdu';
      src: url('${nastaliq700}') format('woff2');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Naskh Arabic';
      src: url('${naskh400}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Naskh Arabic';
      src: url('${naskh700}') format('woff2');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Amiri';
      src: url('${amiri400}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Amiri';
      src: url('${amiri700}') format('woff2');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Plus Jakarta Sans';
      src: url('${latin400}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Plus Jakarta Sans';
      src: url('${latin700}') format('woff2');
      font-weight: 700;
      font-style: normal;
    }
    .font-urdu, .font-nastaliq { font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; }
    .font-arabic { font-family: 'Amiri', 'Noto Naskh Arabic', serif; }
    .font-english { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .font-heading-urdu { font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; font-weight: 700; }
    .font-heading-arabic { font-family: 'Amiri', 'Noto Naskh Arabic', serif; font-weight: 700; }
    .font-heading-english { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-weight: 700; }
  `;

  // Construct full HTML to load in Puppeteer for DOM measurement & PDF generation
  // We mirror the exact HTML generation in createBookPdfBlob
  const testHtml = `
<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontCss}

    body {
      margin: 0;
      padding: 0;
      line-height: 2.1;
      color: #0f172a;
      background: white;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      direction: rtl;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    .page {
      break-after: auto;
      break-inside: avoid;
      position: relative;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      box-sizing: border-box;
      background: #FFFFFF;
      overflow: hidden;
      margin: 0 auto;
      page-break-after: always;
    }

    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      height: 297mm;
      padding: 16mm 14mm;
      background-color: #0F172A;
      color: white;
      position: relative;
      box-sizing: border-box;
    }

    .cover-frame-outer {
      position: absolute;
      top: 8mm;
      bottom: 8mm;
      left: 8mm;
      right: 8mm;
      border: 2px solid #D4AF3790;
      border-radius: 8px;
    }
    .cover-frame-inner {
      position: absolute;
      top: 10.5mm;
      bottom: 10.5mm;
      left: 10.5mm;
      right: 10.5mm;
      border: 1px solid #D4AF3740;
      border-radius: 4px;
    }

    .cover-top {
      margin-top: 4%;
      width: 100%;
      position: relative;
      z-index: 10;
    }

    .cover-title {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.5;
      margin-bottom: 12px;
      color: #ffffff;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .cover-subtitle {
      font-size: 18px;
      color: #D4AF37;
      margin-top: 8px;
      line-height: 1.6;
    }

    .cover-bottom {
      margin-bottom: 3%;
      width: 100%;
      border-top: 1px solid #D4AF3750;
      padding-top: 14px;
      position: relative;
      z-index: 10;
    }

    .cover-author {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }

    .content-page {
      padding: 6mm 6mm;
      display: flex;
      flex-direction: column;
      height: 297mm;
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
    }

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
      font-weight: 700;
      font-size: 12px;
      text-align: center;
      margin-bottom: 2px;
    }

    .chapter-title {
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      margin-bottom: 10px;
      padding-bottom: 5px;
      text-align: center;
      line-height: 1.4;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 8px;
      margin-bottom: 5px;
      background: #f8fafc;
      padding: 3px 8px;
      border-right: 4px solid #D4AF37;
      border-radius: 4px;
      line-height: 1.4;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .body-text {
      font-size: 15px;
      text-align: justify;
      color: #334155;
      line-height: 2.1;
    }

    .body-text p {
      text-indent: 1.6em;
      margin-top: 0;
      margin-bottom: 0.5em;
      line-height: 2.1;
      text-align: justify;
    }

    .summary-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 6px 10px;
      border-radius: 6px;
      margin-bottom: 10px;
      color: #78350f;
      font-size: 13px;
      line-height: 1.8;
    }

    .toc-title {
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 14px;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 5px;
      font-family: 'Noto Nastaliq Urdu', serif;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }

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
    }

    .page-number-badge {
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
  </style>
</head>
<body dir="rtl">
  <!-- Cover Page -->
  <div class="page cover-page" id="page-0">
    <div class="cover-frame-outer"></div>
    <div class="cover-frame-inner"></div>
    <div class="cover-top">
      <div class="cover-title font-heading-urdu">المنہاج: علم سے عمل اور تسخیرِ کائنات تک کا سفر</div>
      <div class="cover-subtitle font-heading-urdu">جامع فکری، علمی اور جدید تحقیقی رہنما</div>
    </div>
    <div class="cover-bottom">
      <div style="font-size: 12px; color: #D4AF37;">مصنّف</div>
      <div class="cover-author font-heading-urdu">مفتی عبدالحفیظ</div>
    </div>
  </div>

  <!-- TOC Page (Page 1) -->
  <div class="page content-page" id="page-1">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>فہرستِ مضامین</span>
        </div>
        <div class="page-main-body">
          <div class="toc-title font-heading-urdu">فہرستِ مضامین</div>
          <div class="toc-item">
            <span>پیش لفظ و دیباچہ</span>
            <span style="flex:1; border-bottom:1px dotted #94a3b8; margin:0 8px;"></span>
            <span>صفحہ ۲</span>
          </div>
          <div class="toc-item">
            <span>باب ۱: حقیقی علم اور شعور کی ضرورت</span>
            <span style="flex:1; border-bottom:1px dotted #94a3b8; margin:0 8px;"></span>
            <span>صفحہ ۳</span>
          </div>
          <div class="toc-item">
            <span>باب ۲: تحقیق، تدبر اور عصری تقاضے</span>
            <span style="flex:1; border-bottom:1px dotted #94a3b8; margin:0 8px;"></span>
            <span>صفحہ ۴</span>
          </div>
          <div class="toc-item">
            <span>باب ۳: فکرِ المنہاج اور مستقبل کی حکمتِ عملی</span>
            <span style="flex:1; border-bottom:1px dotted #94a3b8; margin:0 8px;"></span>
            <span>صفحہ ۵</span>
          </div>
          <div class="toc-item">
            <span>حاصلِ کلام و اختتامیہ</span>
            <span style="flex:1; border-bottom:1px dotted #94a3b8; margin:0 8px;"></span>
            <span>صفحہ ۶</span>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۱</span>
          <span>فہرستِ مضامین</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Preface Page (Page 2) -->
  <div class="page content-page" id="page-2">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>پیش لفظ</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge font-heading-urdu">پیش لفظ</div>
          <div class="chapter-title font-heading-urdu">دیباچہ و تعارفِ کتاب</div>
          <div class="body-text">
            <p class="font-urdu">علم انسان کی وہ بنیادی صفت ہے جو اسے دیگر مخلوقات سے ممتاز کرتی ہے۔ جیسا کہ حدیثِ مبارکہ میں ارشاد ہوا: <span class="font-arabic" style="font-size: 17px; font-weight:700;">"طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ"</span> (علم حاصل کرنا ہر مسلمان پر فرض ہے)۔ جدید دور میں سائنسی اور تکنیکی علوم کا حصول بھی اسی دائرے میں آتا ہے۔</p>
            <p class="font-urdu">ہمارا بنیادی مقصد معلومات کو حقیقی تفہیم، اور تفہیم کو عملی صلاحیت میں بدلنا ہے۔ <span class="font-english" style="font-weight:700;">"Knowledge is power, but application of knowledge is true mastery."</span> اس کتاب میں ہم انہی اصولوں کا فکری جائزہ لیں گے۔</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۲</span>
          <span>دیباچہ</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Chapter 1 Page (Page 3) - SHORT CHAPTER -->
  <div class="page content-page" id="page-3">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>باب ۱</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge font-heading-urdu">باب ۱</div>
          <div class="chapter-title font-heading-urdu">باب ۱: حقیقی علم اور شعور کی ضرورت</div>
          <div class="summary-box"><strong>خلاصۂ باب: </strong>مختصر ابتدائی جائزہ جس میں علم کی حقیقی ماہیت بیان کی گئی ہے۔</div>
          <div class="section-title font-heading-urdu">علم اور معلومات میں بنیادی فرق</div>
          <div class="body-text">
            <p class="font-urdu">معلومات کا ذخیرہ کر لینا علم نہیں کہلاتا، بلکہ جب تک معلومات انسان کے کردار، فکر اور عمل میں مثبت تبدیلی نہ لائیں، وہ حقیقی علم کی تعریف میں پورا نہیں اترتیں۔</p>
            <p class="font-urdu">موجودہ دور میں ڈیٹا کا طوفان ہے، مگر حکمت اور بصیرت کی کمی ہے۔ انسان کو چاہیے کہ وہ سطحی معلومات سے آگے بڑھ کر گہری تفہیم حاصل کرے۔</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۳</span>
          <span>المنہاج</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Chapter 2 Page (Page 4) - LONG CHAPTER -->
  <div class="page content-page" id="page-4">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>باب ۲</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge font-heading-urdu">باب ۲</div>
          <div class="chapter-title font-heading-urdu">باب ۲: تحقیق، تدبر اور عصری تقاضے</div>
          <div class="summary-box"><strong>خلاصۂ باب: </strong>جامع تفصیلی جائزہ جس میں جدید سائنسی اور فکری اصولوں کا احاطہ کیا گیا ہے۔</div>
          <div class="section-title font-heading-urdu">قرآنی ہدایت اور تدبرِ کائنات</div>
          <div class="body-text">
            <p class="font-urdu">قرآنِ کریم بار بار انسان کو کائنات کی نشانیوں میں غور و فکر کرنے کی دعوت دیتا ہے۔ ارشادِ باری تعالی ہے: <span class="font-arabic" style="font-size:17px; font-weight:700;">"إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ"</span> (اللہ سے اس کے وہی بندے ڈرتے ہیں جو علم والے ہیں)۔</p>
            <p class="font-urdu">حقیقی عالم وہ ہے جو کائنات کے قوانین کا مطالعہ کر کے خالق کی عظمت کو پہچانے۔ اس مقصد کے لیے مشاہدہ، تجربہ اور سائنسی تحقیق کا راستہ اختیار کرنا عینِ مطلوب ہے۔</p>
          </div>
          <div class="section-title font-heading-urdu">جدید دور کے چیلنجز اور ہنر مندی</div>
          <div class="body-text">
            <p class="font-urdu">اکیسویں صدی میں تعلیم صرف روایتی ڈگریوں تک محدود نہیں رہی۔ Alvin Toffler نے سچ کہا تھا: <span class="font-english" style="font-style:italic;">"The illiterate of the 21st century will not be those who cannot read and write, but those who cannot learn, unlearn, and relearn."</span></p>
            <p class="font-urdu">جب تک ہم جدید صلاحیتیں اور ڈیجیٹل ہنر نہیں سیکھیں گے، ہم عالمی سطح پر مؤثر کردار ادا نہیں کر سکتے۔ وقت کا تقاضا ہے کہ ہم اپنی صلاحیتوں کو مسلسل اپ ڈیٹ کرتے رہیں۔</p>
          </div>
          <div class="section-title font-heading-urdu">عملی تطبیق اور مسلسل بہتری</div>
          <div class="body-text">
            <p class="font-urdu">عملی تطبیق کے بغیر تمام نظریہ جات محض کاغذی دعوے بن کر رہ جاتے ہیں۔ ہر طالبِ علم اور محقق کے لیے ضروری ہے کہ وہ اپنے حاصل کردہ علم کو روزمرہ کے مسائل حل کرنے میں استعمال کرے۔</p>
            <p class="font-urdu">تسلسل، استقامت اور اخلاص ہی وہ بنیادی صفات ہیں جو انسان کو درجہ بدرجہ کامیابی اور مہارت کی بلندیوں تک پہنچاتی ہیں۔</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۴</span>
          <span>المنہاج</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Chapter 3 Page (Page 5) -->
  <div class="page content-page" id="page-5">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>باب ۳</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge font-heading-urdu">باب ۳</div>
          <div class="chapter-title font-heading-urdu">باب ۳: فکرِ المنہاج اور مستقبل کی حکمتِ عملی</div>
          <div class="summary-box"><strong>خلاصۂ باب: </strong>آئندہ کے معماروں کے لیے واضح عمل اور تعلیمی لائحہ عمل۔</div>
          <div class="section-title font-heading-urdu">جامع تعلیمی فریم ورک</div>
          <div class="body-text">
            <p class="font-urdu">المنہاج فریم ورک چار بنیادی ستونوں پر قائم ہے: مستند علم، گہری سمجھ، عملی استعمال، اور حقیقی مہارت۔ ان چاروں مرحلوں سے گزرے بغیر کوئی بھی تعلیمی نظام مکمل نہیں ہو سکتا۔</p>
          </div>
          <div class="section-title font-heading-urdu">حکمت اور اخلاقی ذمہ داری</div>
          <div class="body-text">
            <p class="font-urdu">اخلاقیات کے بغیر علم محض طاقت بن جاتا ہے جو تباہی پھیلا سکتا ہے۔ اس لیے ہر علمی اور سائنسی پیش رفت کو انسانیت کی خدمت اور اخلاقی حدود کے تابع ہونا چاہیے۔</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۵</span>
          <span>المنہاج</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Conclusion Page (Page 6) -->
  <div class="page content-page" id="page-6">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span>Qalam AI</span>
          <span style="font-weight:700">المنہاج</span>
          <span>اختتامیہ</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge font-heading-urdu">اختتامیہ</div>
          <div class="chapter-title font-heading-urdu">حاصلِ کلام و تجاویز</div>
          <div class="body-text">
            <p class="font-urdu">خلاصہ یہ ہے کہ حقیقی کامیابی علم کی روح کو سمجھنے اور اسے عمل کا پیراہن پہنانے میں مضمر ہے۔ ہمیں چاہیے کہ ہم مسلسل سیکھنے کے عمل کو اپنی زندگی کا شعار بنائیں۔</p>
            <p class="font-urdu">اللہ تعالی سے دعا ہے کہ وہ ہمیں نافع علم عطا فرمائے اور اس پر عمل کی توفیق مرحمت فرمائے۔ آمین!</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۶</span>
          <span>اختتامیہ</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(testHtml, { waitUntil: 'load', timeout: 30000 });
  await page.evaluateHandle('document.fonts.ready');

  console.log('3. Inspecting Font Status and Computed Font Families/Weights in Puppeteer...');

  const fontAudit = await page.evaluate(() => {
    const fontsLoaded: string[] = [];
    document.fonts.forEach((f) => {
      fontsLoaded.push(`${f.family} (${f.weight}, ${f.style}): status=${f.status}`);
    });

    // Inspect actual headings and text elements
    const elementsToTest = [
      { name: 'Cover Title', selector: '.cover-title' },
      { name: 'Chapter Title (Urdu Heading)', selector: '.chapter-title' },
      { name: 'Section Title (Urdu Subheading)', selector: '.section-title' },
      { name: 'Body Text (Urdu)', selector: '.body-text p' },
      { name: 'Arabic Verse Text', selector: '.font-arabic' },
      { name: 'English Text', selector: '.font-english' },
    ];

    const elementStyles = elementsToTest.map((item) => {
      const el = document.querySelector(item.selector);
      if (!el) return { name: item.name, found: false };
      const comp = window.getComputedStyle(el);
      return {
        name: item.name,
        found: true,
        fontFamily: comp.fontFamily,
        fontWeight: comp.fontWeight,
        fontSize: comp.fontSize,
      };
    });

    return { fontsLoaded, elementStyles };
  });

  console.log('\n--- FONT LOADING AUDIT ---');
  fontAudit.fontsLoaded.forEach((f) => console.log(' Font:', f));

  console.log('\n--- COMPUTED STYLE AUDIT ---');
  fontAudit.elementStyles.forEach((s) => {
    console.log(` ${s.name}: ${s.found ? `family="${s.fontFamily}", weight=${s.fontWeight}, size=${s.fontSize}` : 'NOT FOUND'}`);
  });

  console.log('\n4. Measuring Vertical Space and Page Heights for Pagination Analysis...');

  const pageMetrics = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('.page'));
    return pages.map((p, idx) => {
      const pageRect = p.getBoundingClientRect();
      const mainBody = p.querySelector('.page-main-body');
      const mainBodyRect = mainBody ? mainBody.getBoundingClientRect() : null;
      
      // Calculate vertical space used by inner content
      let contentTop = 0;
      let contentBottom = 0;
      let contentHeight = 0;

      if (mainBody) {
        const children = Array.from(mainBody.children);
        if (children.length > 0) {
          contentTop = children[0].getBoundingClientRect().top - mainBodyRect!.top;
          const lastChildRect = children[children.length - 1].getBoundingClientRect();
          contentBottom = lastChildRect.bottom - mainBodyRect!.top;
          contentHeight = contentBottom - contentTop;
        }
      }

      const availableHeight = mainBodyRect ? mainBodyRect.height : pageRect.height;
      const fillPercentage = availableHeight > 0 ? (contentHeight / availableHeight) * 100 : 0;

      return {
        pageIndex: idx,
        pageId: p.id,
        pageTotalHeightPx: pageRect.height,
        mainBodyAvailablePx: availableHeight,
        contentUsedPx: contentHeight,
        fillPercentage: fillPercentage.toFixed(1),
        headingsOnPage: Array.from(p.querySelectorAll('.chapter-title, .section-title')).map((h) => h.textContent?.trim()),
        paragraphCount: p.querySelectorAll('.body-text p').length,
      };
    });
  });

  console.log('\n--- PAGE METRICS & VERTICAL FILL AUDIT ---');
  pageMetrics.forEach((m) => {
    console.log(`Page ${m.pageIndex} (${m.pageId}): Available Main Body = ${m.mainBodyAvailablePx.toFixed(0)}px, Used Content = ${m.contentUsedPx.toFixed(0)}px, Fill = ${m.fillPercentage}% | Paragraphs: ${m.paragraphCount} | Headings: ${JSON.stringify(m.headingsOnPage)}`);
  });

  console.log('\n5. Generating Actual Vector PDF File...');
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    preferCSSPageSize: true,
  });

  await browser.close();

  const outDir = path.resolve(process.cwd(), '.qalam_jobs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, 'live_verification_inspection.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(pdfBuffer));

  console.log(`\n✅ PDF successfully saved to: ${pdfPath}`);
  console.log(`PDF File Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log('====================================================');
}

runRealPdfVerification().catch((err) => {
  console.error('Real PDF Verification script failed:', err);
  process.exit(1);
});
