import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function inspectGeneratedPdf() {
  console.log('Inspecting generated natural PDF...');

  // Read the PDF file to check header (%PDF-)
  const pdfPath = path.join(process.cwd(), '.qalam_jobs', 'test_natural_pdf_output.pdf');
  const buffer = fs.readFileSync(pdfPath);
  const header = buffer.toString('utf-8', 0, 8);
  console.log(`PDF Header: "${header}" (Valid %PDF-: ${header.startsWith('%PDF-')})`);
  console.log(`PDF Buffer Length: ${buffer.length} bytes`);

  // Let's re-run puppeteer with the exact HTML and count rendered pages in Chromium DOM
  // To see how Chromium naturally paginated the content
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  
  // We can load the HTML and run page.evaluate to measure element heights and positions
  const testHtml = fs.readFileSync(path.join(process.cwd(), 'tests', 'test-natural-pdf.ts'), 'utf-8');
  // Extract htmlContent from test-natural-pdf.ts
  const htmlMatch = testHtml.match(/const htmlContent = `([\s\S]*?)`;/);
  if (htmlMatch) {
    const htmlStr = htmlMatch[1];
    await page.setContent(htmlStr, { waitUntil: 'load' });

    const layoutMetrics = await page.evaluate(() => {
      const chapterBlocks = Array.from(document.querySelectorAll('.chapter-block'));
      const headings = Array.from(document.querySelectorAll('.chapter-title, .section-title'));
      const paras = Array.from(document.querySelectorAll('.body-text p'));

      return {
        chapterCount: chapterBlocks.length,
        headingCount: headings.length,
        paragraphCount: paras.length,
        headingPositions: headings.map(h => ({
          text: h.textContent?.trim(),
          top: h.getBoundingClientRect().top,
          bottom: h.getBoundingClientRect().bottom
        }))
      };
    });

    console.log('--- LAYOUT METRICS ---');
    console.log(`Chapters: ${layoutMetrics.chapterCount}`);
    console.log(`Headings: ${layoutMetrics.headingCount}`);
    console.log(`Paragraphs: ${layoutMetrics.paragraphCount}`);
    console.log('Heading Positions:', layoutMetrics.headingPositions);
  }

  await browser.close();
}

inspectGeneratedPdf().catch(err => console.error('Inspection error:', err));
