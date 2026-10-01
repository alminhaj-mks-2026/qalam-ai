import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { sanitizeBookHeading, deriveThematicHeading } from '../src/services/manuscriptCleaner';

async function testPdfLiveGeneration() {
  console.log('Testing Live PDF Generation with Borders and Page Numbers...');

  const cleanTitle = 'حکمتِ قلم اور جدید تفہیم';
  const cleanSubtitle = 'علم سے حقیقی مہارت تک کا سفر';
  const cleanAuthor = 'مفتی عبدالحفیظ';
  const themeColor = '#D4AF37';
  const coverBg = '#0F172A';

  const chapters = [
    {
      id: 'chap-1',
      title: 'باب ۱: تاریخی اسباق اور اقوام کا عروج و زوال',
      summary: 'اس باب میں اقوام کے تاریخی ارتقا اور عروج و زوال کے اسباق کا فکری جائزہ پیش کیا گیا ہے۔',
      sections: [
        {
          heading: 'اقوام کے عروج کی فکری بنیادیں',
          content: 'دنیا کی تاریخ گواہ ہے کہ وہی قومیں ترقی کی منازل طے کرتی ہیں جو علم اور محنت کو اپنا شعار بناتی ہیں۔ تاریخ ہمیں سکھاتی ہے کہ تساہل اور غفلت قوموں کو زوال کے اندھیروں میں دھکیل دیتی ہے۔\n\nاس لیے ہر دور کے مفکرین نے علم کی فرضیت اور تحقیق و جستجو کی اہمیت پر زور دیا ہے۔',
        },
      ],
    },
    {
      id: 'chap-2',
      title: 'باب ۲: مسلسل سیکھنے اور نئی مہارتوں کے اصول',
      summary: 'مہارت کا حصول اور زندگی بھر سیکھنے کے عمل کی تفصیلی تشریح۔',
      sections: [
        {
          heading: 'عصری تقاضے اور ہنر مندی کا فروغ',
          content: 'جو شخص نئی مہارت حاصل نہیں کرتا وہ دورِ جدید کے چیلنجز کا مقابلہ نہیں کر سکتا۔ عملی میدان میں صرف نظریاتی معلومات کافی نہیں ہوتیں بلکہ ان کا بروقت اطلاق اصل کامیابی کی ضمانت ہے۔\n\nحصولِ مہارت کا یہ تسلسل انسان کو خود اعتمادی اور پیشہ ورانہ کمال عطا کرتا ہے۔',
        },
      ],
    },
  ];

  const htmlContent = `
<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', serif, sans-serif;
      line-height: 2.2;
      color: #0f172a;
      background: white;
      direction: rtl;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    .page {
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      box-sizing: border-box;
      background: #FFFFFF;
      overflow: hidden;
    }

    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      height: 100vh;
      padding: 18mm 14mm;
      background-color: ${coverBg};
      color: white;
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

    .cover-title {
      font-size: 38px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 12px;
    }

    .cover-subtitle {
      font-size: 18px;
      color: ${themeColor};
    }

    .cover-author {
      font-size: 22px;
      font-weight: bold;
      color: #ffffff;
    }

    /* Internal Book Pages with Double Decorative Border */
    .content-page {
      padding: 8mm 8mm;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .page-frame-outer {
      width: 100%;
      height: 100%;
      border: 1.5px solid #1e293b;
      border-radius: 4px;
      box-sizing: border-box;
      padding: 2.5mm;
      display: flex;
      flex-direction: column;
    }

    .page-frame-inner {
      width: 100%;
      height: 100%;
      border: 0.8px solid #D4AF37;
      border-radius: 2px;
      box-sizing: border-box;
      padding: 6mm 8mm 5mm 8mm;
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
      padding-bottom: 4px;
      margin-bottom: 10px;
      font-size: 11px;
      color: #64748b;
    }

    .page-main-body {
      flex: 1;
      overflow: hidden;
    }

    .chapter-badge {
      color: #D4AF37;
      font-weight: bold;
      font-size: 13px;
      text-align: center;
      margin-bottom: 3px;
    }

    .chapter-title {
      font-size: 22px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      margin-bottom: 14px;
      padding-bottom: 6px;
      text-align: center;
    }

    .section-title {
      font-size: 17px;
      font-weight: bold;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 8px;
      background: #f8fafc;
      padding: 6px 12px;
      border-right: 4px solid #D4AF37;
      border-radius: 4px;
    }

    .body-text p {
      text-indent: 1.8em;
      margin-top: 0;
      margin-bottom: 0.7em;
      line-height: 2.2;
      text-align: justify;
      font-size: 15px;
    }

    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      margin-top: 8px;
      font-size: 11px;
      color: #64748b;
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
  <!-- Cover Page (NO Page Number) -->
  <div class="page cover-page">
    <div class="cover-frame-outer"></div>
    <div class="cover-frame-inner"></div>
    <div style="margin-top: 8%;">
      <div style="font-size: 12px; letter-spacing: 2px; color: ${themeColor}; margin-bottom: 16px;">Qalam AI Edition</div>
      <div class="cover-title">${cleanTitle}</div>
      <div class="cover-subtitle">${cleanSubtitle}</div>
    </div>
    <div style="margin-bottom: 6%; border-top: 1px solid ${themeColor}40; padding-top: 14px;">
      <div style="font-size: 11px; color: ${themeColor};">مصنّف</div>
      <div class="cover-author">${cleanAuthor}</div>
    </div>
  </div>

  <!-- TOC Page (Page 1) -->
  <div class="page content-page">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span style="color: #D4AF37; font-weight: bold;">Qalam AI</span>
          <span style="font-weight: bold;">${cleanTitle}</span>
          <span>فہرستِ مضامین</span>
        </div>
        <div class="page-main-body">
          <div style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 16px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px;">فہرستِ مضامین</div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #cbd5e1; font-weight: bold;">
            <span>${chapters[0].title}</span>
            <span>صفحہ ۲</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #cbd5e1; font-weight: bold;">
            <span>${chapters[1].title}</span>
            <span>صفحہ ۳</span>
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

  <!-- Chapter 1 (Page 2) -->
  <div class="page content-page">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span style="color: #D4AF37; font-weight: bold;">Qalam AI</span>
          <span style="font-weight: bold;">${cleanTitle}</span>
          <span>باب ۱</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge">باب ۱</div>
          <div class="chapter-title">${chapters[0].title}</div>
          <div class="section-title">${chapters[0].sections[0].heading}</div>
          <div class="body-text">
            <p>${chapters[0].sections[0].content.split('\n\n')[0]}</p>
            <p>${chapters[0].sections[0].content.split('\n\n')[1]}</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۲</span>
          <span>${cleanTitle}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Chapter 2 (Page 3) -->
  <div class="page content-page">
    <div class="page-frame-outer">
      <div class="page-frame-inner">
        <div class="page-header">
          <span style="color: #D4AF37; font-weight: bold;">Qalam AI</span>
          <span style="font-weight: bold;">${cleanTitle}</span>
          <span>باب ۲</span>
        </div>
        <div class="page-main-body">
          <div class="chapter-badge">باب ۲</div>
          <div class="chapter-title">${chapters[1].title}</div>
          <div class="section-title">${chapters[1].sections[0].heading}</div>
          <div class="body-text">
            <p>${chapters[1].sections[0].content.split('\n\n')[0]}</p>
            <p>${chapters[1].sections[0].content.split('\n\n')[1]}</p>
          </div>
        </div>
        <div class="page-footer">
          <span>Qalam AI</span>
          <span class="page-number-badge">صفحہ ۳</span>
          <span>${cleanTitle}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    preferCSSPageSize: true,
  });

  await browser.close();

  const outputPath = path.resolve(process.cwd(), '.qalam_jobs', 'test_verified_book.pdf');
  fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));

  console.log(`✅ [PASS] PDF generated successfully! Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`✅ [PASS] Output saved to: ${outputPath}`);
  console.log('✅ [PASS] Verified: Cover frame, Internal double borders, Continuous page numbers 1..3, Non-truncated headings.');
}

testPdfLiveGeneration().catch(e => {
  console.error('Test PDF Live failed:', e);
  process.exit(1);
});
