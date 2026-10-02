import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function testNaturalPdf() {
  console.log('Testing Natural A4 PDF Page Flow...');

  const cleanTitle = 'حکمتِ قلم اور جدید تفہیم';
  const cleanSubtitle = 'علم سے حقیقی مہارت تک کا سفر';
  const cleanAuthor = 'مفتی عبدالحفیظ';
  const themeColor = '#D4AF37';
  const coverBg = '#0F172A';

  // Create a long sample chapter with multiple sections and paragraphs
  const longChapter1 = {
    title: 'باب ۱: فکری بنیادیں اور انسانی ترقی کے جدید اصول',
    summary: 'اس باب میں انسانی تاریخ کے فکری ارتقا، علمی تسلسل اور فکرِ جدید کا تفصیلی جائزہ لیا گیا ہے۔',
    sections: [
      {
        heading: 'تاریخی ارتقا اور علم کی فرضیت',
        content: `دنیا کی تاریخ گواہ ہے کہ وہی قومیں ترقی کی منازل طے کرتی ہیں جو علم اور محنت کو اپنا شعار بناتی ہیں۔ تاریخ ہمیں سکھاتی ہے کہ تساہل اور غفلت قوموں کو زوال کے اندھیروں میں دھکیل دیتی ہے۔\n\nاس لیے ہر دور کے مفکرین نے علم کی فرضیت اور تحقیق و جستجو کی اہمیت پر زور دیا ہے۔ علم کی روشنی ہی انسان کو گمراہی کے اندھیروں سے نکال کر ہدایت اور فلاح کی شاہراہ پر گامزن کرتی ہے۔\n\nقرونِ اولیٰ کے مسلمان سائنس دانوں اور مفکرین نے دنیا کو وہ سائنسی بنیادیں فراہم کیں جن پر جدید تہذیب کی عمارت کھڑی ہے۔ ان کا بنیادی اصول مشاہدہ، تدبر اور تحقیق تھا۔`
      },
      {
        heading: 'معلومات سے حکمت تک کا سفر',
        content: `معلومات کا حجم بڑھ جانا بذاتِ خود کامیابی نہیں ہے۔ اصل کامیابی یہ ہے کہ انسان ان معلومات کو سمجھے، ان کا تجزیہ کرے اور ان سے حکمت و بصیرت حاصل کرے۔\n\nموجودہ دور میں انفارمیشن کا طوفان ہے، لیکن حقیقی دانش اور فکری پختگی نایاب ہوتی جا رہی ہے۔ انسان کو چاہیے کہ وہ سطحی خبروں اور غیر مصدقہ دعوؤں کے بجائے مستند ذرائع اور گہرے مطالعے کی طرف لوٹے۔\n\nجب تک ہم اپنی سوچ میں تنقیدی جائزہ اور تحقیقی روئیہ پیدا نہیں کریں گے، اس وقت تک ہم علم سے عملی فائدے حاصل کرنے میں ناکام رہیں گے۔`
      },
      {
        heading: 'جدید چیلنجز اور اکیسویں صدی کا نصاب',
        content: `اکیسویں صدی کے تعلیمی چیلنجز پچھلی صدیوں سے بالکل مختلف ہیں۔ آج صرف ڈگری حاصل کر لینا کافی نہیں، بلکہ نئی مہارتیں سیکھنا اور مسلسل اپنے علم کو اپ ڈیٹ کرنا ضروری ہے۔\n\nجو قومیں ٹیکنالوجی، مصنوعی ذہانت اور جدید علوم میں پیش قدمی نہیں کرتی ہیں، وہ عالمی دوڑ میں پیچھے رہ جاتی ہیں۔ ہمیں اپنے تعلیمی اداروں میں تحقیق، تخلیق اور حلِ مسائل کا ماحول پیدا کرنا ہو گا۔`
      }
    ]
  };

  const longChapter2 = {
    title: 'باب ۲: عملی تطبیق اور مہارتِ تامہ کا حصول',
    summary: 'نظریاتی علوم کو عملی زندگی میں استعمال کرنے کے زریں قواعد۔',
    sections: [
      {
        heading: 'نظریہ اور عمل کا باہمی ربط',
        content: `علم کی حقیقی قدر اس وقت ظاہر ہوتی ہے جب اسے عمل میں لایا جائے۔ نظریاتی باتیں جتنی بھی دلکش ہوں، اگر ان کا کوئی عملی نتیجہ نہ نکلے تو وہ بے سود ثابت ہوتی ہیں۔\n\nہر محقق اور طالبِ علم پر لازم ہے کہ وہ اپنے علم کا جائزہ لے اور یہ دیکھے کہ اس کا علم کس طرح سوسائٹی کے مسائل حل کر سکتا ہے۔`
      },
      {
        heading: 'استقامت اور مسلسل بہتری',
        content: `کامیابی کا راز کسی ایک دن کی کوشش میں نہیں بلکہ مسلسل اور روزمرہ کی محنت میں پنہاں ہے۔ استقامت انسان کو ان بلندیوں تک پہنچاتی ہے جہاں پہنچنا عام حالات میں ناممکن دکھائی دیتا ہے۔\n\nہمیں چاہیے کہ ہم چھوٹی چھوٹی پیش رفتوں کی قدر کریں اور ہر روز پچھلے دن سے بہتر بننے کی کوشش کریں۔`
      }
    ]
  };

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
      line-height: 2.1;
      color: #0f172a;
      background: white;
      direction: rtl;
    }

    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
    }

    @page :first {
      margin: 0;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      height: 297mm;
      padding: 18mm 14mm;
      background-color: ${coverBg};
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
      font-size: 36px;
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

    /* Table of Contents Page */
    .toc-page {
      page-break-after: always;
      break-after: page;
      padding: 4mm 2mm;
    }

    .toc-title {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 16px;
      color: #0f172a;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 6px;
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

    .toc-dots {
      flex: 1;
      border-bottom: 1.5px dotted #94a3b8;
      margin: 0 10px;
    }

    /* Document Content Flow */
    .book-content-flow {
      width: 100%;
    }

    .chapter-block {
      margin-bottom: 24px;
    }

    .chapter-badge {
      color: #D4AF37;
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
      border-bottom: 2px solid #D4AF37;
      margin-bottom: 12px;
      padding-bottom: 6px;
      text-align: center;
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
      border-right: 4px solid #D4AF37;
      border-radius: 4px;
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
      font-size: 13px;
      line-height: 1.8;
    }

    .body-text p {
      text-indent: 1.8em;
      margin-top: 0;
      margin-bottom: 0.6em;
      line-height: 2.15;
      text-align: justify;
      font-size: 15px;
      color: #334155;
      orphans: 2;
      widows: 2;
    }
  </style>
</head>
<body dir="rtl">
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-frame-outer"></div>
    <div class="cover-frame-inner"></div>
    <div style="margin-top: 10%;">
      <div style="font-size: 12px; letter-spacing: 2px; color: ${themeColor}; margin-bottom: 16px;">Qalam AI Edition</div>
      <div class="cover-title">${cleanTitle}</div>
      <div class="cover-subtitle">${cleanSubtitle}</div>
    </div>
    <div style="margin-bottom: 8%; border-top: 1px solid ${themeColor}40; padding-top: 14px;">
      <div style="font-size: 11px; color: ${themeColor};">مصنّف</div>
      <div class="cover-author">${cleanAuthor}</div>
    </div>
  </div>

  <!-- TOC Page -->
  <div class="toc-page">
    <div class="toc-title">فہرستِ مضامین</div>
    <div class="toc-item">
      <span>${longChapter1.title}</span>
      <span class="toc-dots"></span>
      <span>باب ۱</span>
    </div>
    <div class="toc-item">
      <span>${longChapter2.title}</span>
      <span class="toc-dots"></span>
      <span>باب ۲</span>
    </div>
  </div>

  <!-- Main Content Flow -->
  <div class="book-content-flow">
    <!-- Chapter 1 -->
    <div class="chapter-block">
      <div class="chapter-badge">باب ۱</div>
      <div class="chapter-title">${longChapter1.title}</div>
      <div class="summary-box"><strong>خلاصۂ باب: </strong>${longChapter1.summary}</div>
      ${longChapter1.sections.map(sec => `
        <div class="section-title">${sec.heading}</div>
        <div class="body-text">
          ${sec.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
      `).join('')}
    </div>

    <!-- Chapter 2 -->
    <div class="chapter-block">
      <div class="chapter-badge">باب ۲</div>
      <div class="chapter-title">${longChapter2.title}</div>
      <div class="summary-box"><strong>خلاصۂ باب: </strong>${longChapter2.summary}</div>
      ${longChapter2.sections.map(sec => `
        <div class="section-title">${sec.heading}</div>
        <div class="body-text">
          ${sec.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
  `;

  const headerTemplate = `
    <div style="font-family: 'Noto Nastaliq Urdu', sans-serif; font-size: 9px; color: #64748b; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; direction: rtl; box-sizing: border-box;">
      <span style="color: #D4AF37; font-weight: bold;">Qalam AI</span>
      <span style="font-weight: bold; color: #0f172a;">${cleanTitle}</span>
      <span>کتابی نسخہ</span>
    </div>
  `;

  const footerTemplate = `
    <div style="font-family: 'Noto Nastaliq Urdu', sans-serif; font-size: 9px; color: #64748b; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; direction: rtl; box-sizing: border-box;">
      <span>Qalam AI</span>
      <span style="font-weight: bold; color: #0f172a; background: #f1f5f9; padding: 1px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
        صفحہ <span class="pageNumber"></span>
      </span>
      <span>${cleanTitle}</span>
    </div>
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
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    preferCSSPageSize: true,
  });

  await browser.close();

  const outDir = path.resolve(process.cwd(), '.qalam_jobs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, 'test_natural_pdf_output.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(pdfBuffer));

  console.log(`✅ Natural PDF generated! File size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`Saved to: ${pdfPath}`);
}

testNaturalPdf().catch(err => {
  console.error('Error in testNaturalPdf:', err);
  process.exit(1);
});
