import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Cached base64 fonts for zero-latency, offline font embedding in Puppeteer PDF
let cachedNastaliqFontBase64 = '';
let cachedNaskhFontBase64 = '';
let cachedAmiriFontBase64 = '';

function getLocalFontBase64(relPath: string): string {
  try {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      return `data:font/woff2;base64,${fs.readFileSync(fullPath).toString('base64')}`;
    }
  } catch (e) {
    console.warn(`Could not load font from ${relPath}:`, e);
  }
  return '';
}

function getEmbeddedFontStyles(): string {
  if (!cachedNastaliqFontBase64) {
    cachedNastaliqFontBase64 = getLocalFontBase64('node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2');
  }
  if (!cachedNaskhFontBase64) {
    cachedNaskhFontBase64 = getLocalFontBase64('node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2');
  }
  if (!cachedAmiriFontBase64) {
    cachedAmiriFontBase64 = getLocalFontBase64('node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2');
  }

  return `
    @font-face {
      font-family: 'Noto Nastaliq Urdu';
      src: ${cachedNastaliqFontBase64 ? `url('${cachedNastaliqFontBase64}') format('woff2')` : 'local("Noto Nastaliq Urdu"), serif'};
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Naskh Arabic';
      src: ${cachedNaskhFontBase64 ? `url('${cachedNaskhFontBase64}') format('woff2')` : 'local("Noto Naskh Arabic"), serif'};
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Amiri';
      src: ${cachedAmiriFontBase64 ? `url('${cachedAmiriFontBase64}') format('woff2')` : 'local("Amiri"), serif'};
      font-weight: 400;
      font-style: normal;
    }
  `;
}

// Helper to get Gemini Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to call Gemini API with limited exponential backoff ONLY for true 503/UNAVAILABLE errors
// CRITICAL: 429/RESOURCE_EXHAUSTED must NEVER be retried in a rapid loop, as it exacerbates rate limits
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 1500
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || '').toLowerCase();
      const status = err?.status || err?.code || err?.response?.status;

      // STRICT CHECK: Never retry on 429 / RESOURCE_EXHAUSTED
      const is429Quota =
        status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('resourceexhausted') ||
        errMsg.includes('quota exceeded');

      if (is429Quota) {
        console.warn(`[Gemini API] 429 RESOURCE_EXHAUSTED detected on attempt ${attempt}. Halting retries immediately to protect quota.`);
        throw err;
      }

      // Only retry true transient 503 / UNAVAILABLE / Overloaded errors
      const isTransient503 =
        status === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('high demand') ||
        errMsg.includes('temporarily unavailable');

      if (isTransient503 && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini API] Transient 503/Overloaded. Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Helper to extract structured quota details from Gemini API error
function parseGeminiError(error: any, modelUsed: string) {
  const errMsg = String(error?.message || error || '');
  const status = error?.status || error?.code || error?.response?.status;

  const is429 =
    status === 429 ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('resourceexhausted') ||
    errMsg.includes('quota exceeded') ||
    errMsg.includes('free_tier_requests');

  if (is429) {
    // Try to extract retry delay seconds if available (e.g. "retryDelay":"26s" or "retry in 26.5s")
    let retryAfterSeconds = 30;
    const retryDelayMatch = errMsg.match(/retryDelay["\s:]+["']?(\d+)/i) ||
      errMsg.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i) ||
      errMsg.match(/(\d+)\s*s/i);

    if (retryDelayMatch && retryDelayMatch[1]) {
      const parsed = Math.ceil(parseFloat(retryDelayMatch[1]));
      if (!isNaN(parsed) && parsed > 0 && parsed <= 300) {
        retryAfterSeconds = parsed;
      }
    }

    // Determine if it is a Free Tier daily limit violation
    const isDailyLimit = errMsg.includes('GenerateRequestsPerDay') || errMsg.includes('free_tier_requests');

    let urduMessage = `Gemini AI (${modelUsed}) کے مفت کوٹہ کی حد (429 Quota Exceeded) اس وقت پہنچ چکی ہے۔`;
    if (isDailyLimit) {
      urduMessage = `Gemini AI (${modelUsed}) کا مفت روزانہ کوٹہ (20 درخواستیں فی یوم) مکمل ہو چکا ہے۔ برائے مہربانی چند لمحوں بعد "دوبارہ کوشش کریں" پر کلک کریں یا متبادل ماڈل منتخب کریں۔`;
    } else {
      urduMessage = `Gemini AI کی درخواستوں کی شرح (Rate Limit) مکمل ہو گئی ہے۔ برائے مہربانی ${retryAfterSeconds} سیکنڈ بعد دوبارہ کوشش فرمائیں۔`;
    }

    return {
      statusCode: 429,
      errorCode: 'RESOURCE_EXHAUSTED',
      isQuotaExhausted: true,
      model: modelUsed,
      retryAfterSeconds,
      isDailyLimit,
      error: urduMessage,
      technicalDetails: errMsg.slice(0, 300),
    };
  }

  const is503 =
    status === 503 ||
    errMsg.includes('503') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('Overloaded') ||
    errMsg.includes('temporarily unavailable');

  if (is503) {
    return {
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      isQuotaExhausted: false,
      model: modelUsed,
      retryAfterSeconds: 5,
      error: 'Gemini AI سرور اس وقت عارضی طور پر مصروف (503 Unavailable) ہے۔ برائے مہربانی چند لمحوں بعد "دوبارہ کوشش کریں" پر کلک کریں۔',
      technicalDetails: errMsg.slice(0, 200),
    };
  }

  return {
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    isQuotaExhausted: false,
    model: modelUsed,
    retryAfterSeconds: 3,
    error: error.message || 'Gemini AI کے ساتھ رابطہ قائم نہیں ہو سکا۔ برائے مہربانی دوبارہ کوشش فرمائیں۔',
    technicalDetails: errMsg.slice(0, 200),
  };
}

// Helper to clean, repair, and parse potentially truncated/incomplete Gemini JSON responses
function repairTruncatedJson(jsonStr: string): string {
  let cleaned = jsonStr.trim();
  
  // Clean markdown backticks wrapping if present
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If already completely valid, sanitize control characters and return
  try {
    const sanitized = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
      if (match === '\n') return '\\n';
      if (match === '\r') return '\\r';
      if (match === '\t') return '\\t';
      return '';
    });
    JSON.parse(sanitized);
    return sanitized;
  } catch (e) {}

  // Tracking open quotes and brackets/braces to repair truncated JSON
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastValidIndex = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      if (!inString) {
        lastValidIndex = i;
      }
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      lastValidIndex = i;
    } else if (char === '}') {
      if (stack[stack.length - 1] === '{') {
        stack.pop();
        lastValidIndex = i;
      }
    } else if (char === ']') {
      if (stack[stack.length - 1] === '[') {
        stack.pop();
        lastValidIndex = i;
      }
    } else if (char === ',' || char === ':') {
      // separator tokens
    } else if (!/\s/.test(char)) {
      lastValidIndex = i;
    }
  }

  let truncated = cleaned.slice(0, lastValidIndex + 1);

  if (inString) {
    truncated += '"';
  }

  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === '{') {
      truncated = truncated.trim().replace(/,$/, '');
      truncated += '}';
    } else if (opening === '[') {
      truncated = truncated.trim().replace(/,$/, '');
      truncated += ']';
    }
  }

  // Final control character sanitization on the repaired string
  const finalSanitized = truncated.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
    if (match === '\n') return '\\n';
    if (match === '\r') return '\\r';
    if (match === '\t') return '\\t';
    return '';
  });

  return finalSanitized;
}

// POST /api/generate-pdf
app.post('/api/generate-pdf', async (req, res) => {
  let browser;
  try {
    const { htmlContent, pageSize, orientation } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content required' });
    }

    console.log(`[PDF Generator] Starting PDF generation for "${pageSize}" ${orientation}...`);

    // Inject base64 fonts directly into the HTML <head> for instant rendering
    const fontStyles = `<style id="embedded-mks-fonts">${getEmbeddedFontStyles()}</style>`;
    let finalHtml = htmlContent;
    if (finalHtml.includes('<head>')) {
      finalHtml = finalHtml.replace('<head>', `<head>${fontStyles}`);
    } else {
      finalHtml = `<head>${fontStyles}</head>${finalHtml}`;
    }

    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });

    // Set content and wait for load
    await page.setContent(finalHtml, { 
      waitUntil: 'load',
      timeout: 60000
    });
    
    // Ensure all font faces are loaded
    await page.evaluateHandle('document.fonts.ready');

    // Render completely standard, unencrypted vector PDF
    const pdfBuffer = await page.pdf({
      format: (pageSize as any) || 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }, // Margins are handled in CSS
      preferCSSPageSize: true,
      timeout: 60000
    });
    
    // CRITICAL: Convert Uint8Array to Node Buffer so Express does NOT serialize to JSON!
    const finalBuffer = Buffer.from(pdfBuffer);
    console.log(`[PDF Generator] Successfully generated unencrypted PDF buffer (${(finalBuffer.length / 1024).toFixed(1)} KB)`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBuffer.length.toString());
    res.setHeader('Content-Disposition', 'attachment; filename="book.pdf"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.end(finalBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: 'پی ڈی ایف بنانے کے دوران سرور پر خرابی پیش آئی۔',
      details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close().catch(e => console.error('Error closing browser:', e));
    }
  }
});

// POST /api/generate-book - Real Gemini Book Generation Endpoint
app.post('/api/generate-book', async (req, res) => {
  const requestedModel = req.body.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';
  try {
    const { content, title, authorName, genre, language } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'کتاب تیار کرنے کے لیے تحریری مواد فراہم کرنا ضروری ہے۔' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are an expert scholarly book editor and publisher for "AL-MINHAJ MKS / Qalam AI".
Your task is to analyze the user's raw source material and transform it into a structured, publication-ready book.

Strict Rules:
1. Preserve the user's original meaning, facts, quotes, references, names, and terminology. Do not invent false information, events, or fake citations not supported by the source material.
2. Structure the content logically into chapters and sub-sections based strictly on the actual source material. Do NOT force a fixed number of chapters; let the length and depth of the source material dictate the number of chapters (minimum 1 chapter).
3. Preserve important names, Arabic quotations, Urdu terminology, and original wording where appropriate.
4. If the user provided a title ("${title || ''}"), preserve or refine it tastefully. If no title exists or it's empty, create a compelling title and subtitle based ONLY on the source content.
5. Generate an Introduction / Preface summarizing the book's core vision only if supported by the source material.
6. Generate a Conclusion summarizing the key takeaways from the source material.
7. Create a dynamic Table of Contents matching the actual generated chapters and headings.
8. Detect the language of the source material (${language || 'auto'}). Write all outputs (title, subtitle, introduction, chapters, headings, content, conclusion) in the SAME language as the source material (Urdu RTL, Arabic RTL, English LTR, or Mixed).
9. Use "${authorName || 'عبد الحفیظ'}" as the author name unless specified otherwise.
10. Respect the specified genre context: "${genre || 'general'}".

Output Format Requirement:
Return ONLY a valid JSON object with NO markdown wrapping or code fences.
Target Schema:
{
  "title": "string",
  "subtitle": "string",
  "authorName": "string",
  "language": "ur" | "ar" | "en" | "mixed",
  "introduction": "string",
  "chapters": [
    {
      "id": "chap-1",
      "title": "string",
      "summary": "string",
      "subheadings": ["string"],
      "sections": [
        {
          "heading": "string",
          "content": "string"
        }
      ]
    }
  ],
  "conclusion": "string",
  "tableOfContents": [
    {
      "title": "string",
      "sections": ["string"]
    }
  ]
}`;

    const prompt = `Source Material to transform into a book:

"""
${content}
"""`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: requestedModel,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      })
    );

    const responseText = response.text;
    if (!responseText || !responseText.trim()) {
      throw new Error('Gemini API کی جانب سے خالی جواب موصول ہوا۔');
    }

    let parsedBook;
    try {
      const repairedJson = repairTruncatedJson(responseText);
      parsedBook = JSON.parse(repairedJson);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON response:', responseText);
      throw new Error('Gemini AI کی جانب سے حاصل شدہ جواب درست JSON فارمیٹ میں نہیں تھا۔');
    }

    // Validation
    if (!parsedBook || typeof parsedBook !== 'object') {
      throw new Error('Gemini AI کا ڈیٹا معتبر ساخت پر پورا نہیں اترتا۔');
    }
    if (!parsedBook.title || typeof parsedBook.title !== 'string' || !parsedBook.title.trim()) {
      throw new Error('کتاب کا عنوان تیار نہیں ہو سکا۔');
    }
    if (!Array.isArray(parsedBook.chapters) || parsedBook.chapters.length === 0) {
      throw new Error('کتاب میں کم از کم ایک باب ہونا ضروری ہے۔');
    }

    // Sanitize and validate chapters
    parsedBook.chapters = parsedBook.chapters.map((ch: any, idx: number) => {
      if (!ch.title || typeof ch.title !== 'string') {
        ch.title = `باب ${idx + 1}: تفصیلی مطالعہ`;
      }
      ch.id = ch.id || `chap-${idx + 1}`;
      ch.subheadings = Array.isArray(ch.subheadings) ? ch.subheadings : [];
      ch.sections = Array.isArray(ch.sections) ? ch.sections : [];

      // Ensure sections have valid headings and content
      ch.sections = ch.sections.map((sec: any, sIdx: number) => ({
        heading: sec.heading || ch.subheadings[sIdx] || `عنوان ${sIdx + 1}`,
        content: sec.content || 'اس بخش کی تفصیل موجود نہیں ہے۔',
      }));

      // Sync subheadings if empty
      if (ch.subheadings.length === 0 && ch.sections.length > 0) {
        ch.subheadings = ch.sections.map((s: any) => s.heading);
      }

      return ch;
    });

    // Ensure TOC exists
    if (!Array.isArray(parsedBook.tableOfContents) || parsedBook.tableOfContents.length === 0) {
      parsedBook.tableOfContents = parsedBook.chapters.map((ch: any) => ({
        title: ch.title,
        sections: ch.subheadings,
      }));
    }

    parsedBook.authorName = parsedBook.authorName || authorName || 'عبد الحفیظ';
    parsedBook.introduction = parsedBook.introduction || 'اس کتاب میں پیش کردہ مواد کو علمی اور مفصل انداز میں ترتیب دیا گیا ہے۔';
    parsedBook.conclusion = parsedBook.conclusion || 'حاصلِ کلام یہ ہے کہ منظم نگارش اور تدوین سے ہی علم محفوظ اور مؤثر بنتا ہے۔';

    return res.json({
      success: true,
      modelUsed: requestedModel,
      book: parsedBook,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-book:', error);
    const parsedError = parseGeminiError(error, requestedModel);
    return res.status(parsedError.statusCode).json({
      success: false,
      ...parsedError,
    });
  }
});

// POST /api/suggest-title - Real Gemini Title Suggestion Endpoint
app.post('/api/suggest-title', async (req, res) => {
  const requestedModel = req.body.model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';
  try {
    const { content, genre, language } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Source content is required to suggest titles.' });
    }

    const ai = getGeminiClient();

    const prompt = `Analyze the following source material and suggest 4 elegant, scholarly, and publication-ready book titles with subtitles.
Language: Match the primary language of the source material (${language || 'auto'}).
Genre context: ${genre || 'general'}.

Return ONLY a JSON array of objects:
[
  { "title": "Title 1", "subtitle": "Subtitle 1" },
  { "title": "Title 2", "subtitle": "Subtitle 2" },
  { "title": "Title 3", "subtitle": "Subtitle 3" },
  { "title": "Title 4", "subtitle": "Subtitle 4" }
]

Source Material:
"""
${content.slice(0, 4000)}
"""`;

    const response = await ai.models.generateContent({
      model: requestedModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    if (!responseText || !responseText.trim()) {
      throw new Error('Gemini API کی جانب سے خالی جواب موصول ہوا۔');
    }

    let suggestions;
    try {
      const repairedJson = repairTruncatedJson(responseText);
      suggestions = JSON.parse(repairedJson);
    } catch (parseErr) {
      console.error('Failed to parse suggested titles:', responseText);
      throw new Error('عنوانات کی تجاویز درست فارمیٹ میں موصول نہیں ہوئیں۔');
    }
    return res.json({ success: true, suggestions, modelUsed: requestedModel });
  } catch (error: any) {
    console.error('Error in /api/suggest-title:', error);
    const parsedError = parseGeminiError(error, requestedModel);
    return res.status(parsedError.statusCode).json({
      success: false,
      ...parsedError,
    });
  }
});

// Vite Integration for dev server / Express static for production
async function startServer() {
  // Serve fonts
  app.use('/fonts', express.static('node_modules/@fontsource'));

  if (process.env.NODE_ENV !== 'production') {

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Qalam AI Server running at http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
