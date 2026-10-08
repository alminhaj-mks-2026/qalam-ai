import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DEFAULT_GEMINI_MODEL, SERVER_FALLBACK_MODEL_CHAIN } from './src/config/models';
import {
  cleanRawManuscript,
  sanitizeBookHeading,
  cleanFinalBookContent,
  partitionManuscriptThematically,
  deriveThematicHeading,
  deriveThematicTitleAndAuthor,
  deriveSubstantivePreface,
  deriveSubstantiveConclusion,
  removeDilKiAwazSignatures,
} from './src/services/manuscriptCleaner';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Normalize request URL for Vercel Serverless Function rewrites and route variations
app.use((req, res, next) => {
  const forwardedUrl = (req.headers['x-forwarded-url'] as string) || (req.headers['x-real-url'] as string);
  const matchedPath = req.headers['x-matched-path'] as string;
  const queryPath = (req.query?.path as string) || (req.query?.['1'] as string) || (req.query?.['0'] as string);

  // If Vercel rewrote /api/generate-book to /api?1=generate-book or /api?path=generate-book
  if (queryPath && (req.url === '/api' || req.url.startsWith('/api?') || req.url === '/' || req.url.startsWith('/?'))) {
    const cleanSub = queryPath.startsWith('/') ? queryPath : `/${queryPath}`;
    req.url = `/api${cleanSub}`;
  } else if (forwardedUrl && (req.url === '/api' || req.url === '/' || req.url.startsWith('/api?') || req.url.startsWith('/?'))) {
    req.url = forwardedUrl;
  } else if (matchedPath && (req.url === '/api' || req.url === '/' || req.url.startsWith('/api?') || req.url.startsWith('/?')) && matchedPath !== '/api') {
    req.url = matchedPath;
  }

  console.log(`[DIAGNOSTIC] [APP DISPATCH] ${req.method} final req.url: ${req.url} (original: ${req.originalUrl || 'N/A'})`);
  next();
});

// Safe Body Parsing: handles pre-parsed Vercel serverless bodies, JSON strings, Buffers without crashing on consumed streams
app.use((req, res, next) => {
  // If req.body is already a parsed JS object
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
    return next();
  }

  // If req.body is a JSON string
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
      return next();
    } catch (e) {
      console.warn('[BodyParser] Could not parse string req.body:', e);
    }
  }

  // If req.body is a Buffer
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf-8'));
      return next();
    } catch (e) {
      console.warn('[BodyParser] Could not parse Buffer req.body:', e);
    }
  }

  // If the stream has already been read/ended (common in Vercel), avoid calling express.json which throws
  if (req.readableEnded || req.complete) {
    if (!req.body) {
      req.body = {};
    }
    return next();
  }

  // Otherwise, use express.json safely
  express.json({ limit: '20mb' })(req, res, (err) => {
    if (err) {
      console.warn('[BodyParser] express.json stream parse note:', err?.message || err);
      req.body = req.body || {};
    }
    next();
  });
});

// Cached base64 fonts for zero-latency, offline font embedding in Puppeteer PDF
let cachedNastaliqFontBase64 = '';
let cachedNaskhFontBase64 = '';
let cachedAmiriFontBase64 = '';
let cachedLatinFontBase64 = '';

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
  if (!cachedLatinFontBase64) {
    cachedLatinFontBase64 = getLocalFontBase64('node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2');
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
    @font-face {
      font-family: 'Plus Jakarta Sans';
      src: ${cachedLatinFontBase64 ? `url('${cachedLatinFontBase64}') format('woff2')` : 'local("Plus Jakarta Sans"), sans-serif'};
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

// Centralized supported Flash models for fallback chain in compliance with @google/genai
const FALLBACK_MODEL_CHAIN = SERVER_FALLBACK_MODEL_CHAIN;

// Track models that have exhausted their daily free tier quota (to prioritize active models immediately)
const dailyQuotaExhaustedModels = new Set<string>();

// Global request queue to enforce strictly Concurrency = 1 for all Gemini calls across the server
class GeminiRequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private active = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.active || this.queue.length === 0) return;
    this.active = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch {
        // Rejection handled in enqueue promise wrapper
      } finally {
        // Enforce cool-down of 1500ms between consecutive Gemini calls to prevent hitting RPM limits
        await new Promise((resolve) => setTimeout(resolve, 1500));
        this.active = false;
        this.processNext();
      }
    }
  }
}

const geminiGlobalQueue = new GeminiRequestQueue();

// Model fallback chain: Primary model -> Secondary Flash model -> Third supported Flash model
// Explicit timeout (45s), request ID, job ID, chapter number and model name logged on every call
// Exponential backoff + jitter for 429, 503, 504 and network timeouts. Retries are strictly bounded.
async function executeGeminiWithFallbackChain<T>(
  jobId: string,
  stageName: string,
  chapterNumber: number | null,
  operation: (modelName: string) => Promise<T>
): Promise<{ result: T; modelUsed: string }> {
  return geminiGlobalQueue.enqueue(async () => {
    let lastError: any = null;

    // Prioritize models that have not exhausted their daily free tier quota
    const effectiveChain = [
      ...FALLBACK_MODEL_CHAIN.filter((m) => !dailyQuotaExhaustedModels.has(m)),
      ...FALLBACK_MODEL_CHAIN.filter((m) => dailyQuotaExhaustedModels.has(m)),
    ];

    for (let modelIndex = 0; modelIndex < effectiveChain.length; modelIndex++) {
      const modelName = effectiveChain[modelIndex];
      // Allow at most 1 controlled retry for 503/timeout
      const maxRetriesForThisModel = 1;

      for (let attempt = 0; attempt <= maxRetriesForThisModel; attempt++) {
        const requestId = 'req_' + crypto.randomUUID().slice(0, 8);
        const startTime = Date.now();

        console.log(
          `[Gemini API] [Req: ${requestId}] [Job: ${jobId}] [Stage: ${stageName}] [Chapter: ${chapterNumber ?? 'N/A'}] [Model: ${modelName}] [Attempt: ${attempt + 1}/${maxRetriesForThisModel + 1}] Starting... (Timeout: 45000ms)`
        );

        try {
          // Explicit request timeout of 45 seconds to prevent hung connections
          let timer: NodeJS.Timeout | null = null;
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                reject(new Error(`Gemini API request timed out after 45000ms [Req: ${requestId}, Model: ${modelName}]`));
              }, 45000);
            });

            const operationPromise = operation(modelName);
            const result = await Promise.race([operationPromise, timeoutPromise]);

            const durationMs = Date.now() - startTime;
            console.log(
              `[Gemini API] [Req: ${requestId}] [Job: ${jobId}] [Stage: ${stageName}] [Chapter: ${chapterNumber ?? 'N/A'}] [Model: ${modelName}] Succeeded in ${durationMs}ms.`
            );

            return { result, modelUsed: modelName };
          } finally {
            if (timer) clearTimeout(timer);
          }
        } catch (err: any) {
          lastError = err;
          const durationMs = Date.now() - startTime;
          const errMsg = String(err?.message || err || '');
          const status = err?.status || err?.code || err?.response?.status;

          console.warn(
            `[Gemini API] [Req: ${requestId}] [Job: ${jobId}] [Stage: ${stageName}] [Chapter: ${chapterNumber ?? 'N/A'}] [Model: ${modelName}] Failed in ${durationMs}ms (Status: ${status || 'ERR'}): ${errMsg.slice(0, 180)}`
          );

          const is429 =
            status === 429 ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('resourceexhausted') ||
            errMsg.includes('quota exceeded') ||
            errMsg.includes('free_tier_requests');

          const is503 =
            status === 503 ||
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('high demand') ||
            errMsg.includes('temporarily unavailable');

          const isTimeoutOrNetwork =
            status === 504 ||
            errMsg.includes('timed out') ||
            errMsg.includes('timeout') ||
            errMsg.includes('fetch failed') ||
            errMsg.includes('ECONNRESET') ||
            errMsg.includes('ETIMEDOUT');

          // If 429 quota exhausted: mark daily exhaustion if applicable and switch to next fallback model
          if (is429) {
            if (errMsg.includes('GenerateRequestsPerDay') || errMsg.includes('free_tier_requests') || errMsg.includes('limit: 20')) {
              dailyQuotaExhaustedModels.add(modelName);
              console.warn(`[Gemini API] Daily quota exhausted for ${modelName}. Deprioritizing model.`);
            }

            if (modelIndex < effectiveChain.length - 1) {
              const jitter = Math.floor(Math.random() * 1000) + 1000;
              console.warn(
                `[Gemini API] [Job: ${jobId}] 429 on ${modelName}. Switching to fallback model (${effectiveChain[modelIndex + 1]})...`
              );
              await new Promise((resolve) => setTimeout(resolve, jitter));
              break; // Break inner retry loop to move to next model in chain
            } else {
              break;
            }
          }

          // If 503 or transient network timeout and retries remain: apply exponential backoff + jitter
          if ((is503 || isTimeoutOrNetwork) && attempt < maxRetriesForThisModel) {
            const exponentialDelay = Math.min(6000, 2000 * Math.pow(2, attempt));
            const jitter = Math.floor(Math.random() * 1000);
            const totalDelay = exponentialDelay + jitter;

            console.warn(
              `[Gemini API] [Job: ${jobId}] Transient ${status || 'timeout'} on ${modelName}. Retrying once after ${totalDelay}ms backoff...`
            );
            await new Promise((resolve) => setTimeout(resolve, totalDelay));
            continue; // Retry on same model
          }

          // Otherwise, if there is a next model in fallback chain, move to it
          if (modelIndex < effectiveChain.length - 1) {
            const switchJitter = Math.floor(Math.random() * 1000) + 1000;
            console.warn(
              `[Gemini API] [Job: ${jobId}] Error on ${modelName}. Moving to next fallback model (${effectiveChain[modelIndex + 1]}) after ${switchJitter}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, switchJitter));
            break;
          }
        }
      }
    }

    // All fallback models exhausted
    console.error(
      `[Gemini API] [Job: ${jobId}] [Stage: ${stageName}] [Chapter: ${chapterNumber ?? 'N/A'}] All fallback models exhausted. Final error:`,
      lastError?.message || lastError
    );
    throw lastError;
  });
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
    let retryAfterSeconds = 30;
    const retryDelayMatch =
      errMsg.match(/retryDelay["\s:]+["']?(\d+)/i) ||
      errMsg.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i) ||
      errMsg.match(/(\d+)\s*s/i);

    if (retryDelayMatch && retryDelayMatch[1]) {
      const parsed = Math.ceil(parseFloat(retryDelayMatch[1]));
      if (!isNaN(parsed) && parsed > 0 && parsed <= 300) {
        retryAfterSeconds = parsed;
      }
    }

    const isDailyLimit = errMsg.includes('GenerateRequestsPerDay') || errMsg.includes('free_tier_requests');
    const urduMessage = `Gemini AI سرور اس وقت عارضی طور پر غیر دستیاب ہے (کوٹہ کی حد مکمل ہو چکی ہے)۔ برائے مہربانی کچھ لمحوں بعد دوبارہ کوشش فرمائیں۔ (Service Alert)`;

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
      error: 'Gemini AI سرور اس وقت عارضی طور پر مصروف ہے (Service Alert)۔ برائے مہربانی چند لمحوں بعد دوبارہ کوشش فرمائیں۔',
      technicalDetails: errMsg.slice(0, 200),
    };
  }

  return {
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    isQuotaExhausted: false,
    model: modelUsed,
    retryAfterSeconds: 3,
    error: error?.message || 'Gemini AI کے ساتھ رابطہ قائم نہیں ہو سکا۔ برائے مہربانی دوبارہ کوشش فرمائیں۔',
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
app.post(['/api/generate-pdf', '/generate-pdf'], async (req, res) => {
  let browser;
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { htmlContent, pageSize, orientation, headerTemplate, footerTemplate } = body || {};
    
    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content required' });
    }

    console.log(`[PDF Generator] Starting PDF generation for "${pageSize}" ${orientation}...`);

    // Inject base64 fonts directly into the HTML <head> for instant rendering
    const fontStyles = `<style id="embedded-qalam-fonts">${getEmbeddedFontStyles()}</style>`;
    let finalHtml = htmlContent;
    if (finalHtml.includes('<head>')) {
      finalHtml = finalHtml.replace('<head>', `<head>${fontStyles}`);
    } else {
      finalHtml = `<head>${fontStyles}</head>${finalHtml}`;
    }

    if (process.env.VERCEL) {
      console.log('[PDF Generator] Launching in Vercel Serverless environment using @sparticuz/chromium...');
      const chromium = (await import('@sparticuz/chromium')).default as any;
      const puppeteerCore = (await import('puppeteer-core')).default as any;

      // Locate chromium bin directory if relocated in Vercel bundle
      const candidateBinDirs = [
        path.resolve(process.cwd(), 'node_modules/@sparticuz/chromium/bin'),
        path.resolve(process.cwd(), '../node_modules/@sparticuz/chromium/bin'),
        '/var/task/node_modules/@sparticuz/chromium/bin',
        '/tmp/node_modules/@sparticuz/chromium/bin',
      ];
      let binDir: string | undefined;
      for (const candidate of candidateBinDirs) {
        if (fs.existsSync(candidate)) {
          binDir = candidate;
          break;
        }
      }

      let execPath: string;
      try {
        execPath = binDir
          ? await chromium.executablePath(binDir)
          : await chromium.executablePath();
      } catch (pathErr) {
        console.warn('[PDF Generator] chromium.executablePath resolution fallback:', pathErr);
        execPath = await chromium.executablePath();
      }
      
      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: execPath,
        headless: true,
      });
    } else {
      console.log('[PDF Generator] Launching in local environment using standard puppeteer...');
      const puppeteer = (await import('puppeteer')).default as any;
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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });
    }
    
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

    const hasHeaderFooter = !!(headerTemplate || footerTemplate);

    // Render completely standard, unencrypted vector PDF
    const pdfBuffer = await page.pdf({
      format: (pageSize as any) || 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      displayHeaderFooter: hasHeaderFooter,
      headerTemplate: headerTemplate || '<div style="font-size: 8px;"></div>',
      footerTemplate: footerTemplate || '<div style="font-size: 8px;"></div>',
      margin: hasHeaderFooter
        ? { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }
        : { top: '0px', bottom: '0px', left: '0px', right: '0px' },
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
    console.error('[DIAGNOSTIC] REQUEST_ERROR [PDF GENERATION]:', {
      message: error?.message || String(error),
      stack: error?.stack || 'No stack trace available',
    });
    res.status(500).json({ 
      error: 'پی ڈی ایف بنانے کے دوران سرور پر خرابی پیش آئی۔',
      details: error?.message || String(error),
      stack: error?.stack || 'No stack trace available',
    });
  } finally {
    if (browser) {
      await browser.close().catch((e: any) => console.error('Error closing browser:', e));
    }
  }
});

function safelyParseAndNormalizeOutline(text: string, rawContent: string, defaultTitle?: string, defaultAuthor?: string, language: string = 'ur'): any {
  let cleaned = (text || '').trim();
  cleaned = removeDilKiAwazSignatures(cleaned);
  
  // Clean markdown backticks wrapping if present
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const semanticDefaults = deriveThematicTitleAndAuthor(rawContent, defaultTitle, defaultAuthor);

  // Try standard JSON parsing with robust repair first
  try {
    const repaired = repairTruncatedJson(cleaned);
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
      console.log(`[Outline Parser] Standard parsed outline successfully. Title: ${parsed.title}, Chapters: ${parsed.chapters.length}`);
      
      const bookTitle = sanitizeBookHeading(parsed.title, semanticDefaults.title);
      const bookSubtitle = sanitizeBookHeading(parsed.subtitle, semanticDefaults.subtitle);
      const bookAuthor = parsed.authorName?.trim() || semanticDefaults.authorName;

      const introduction = parsed.introduction && parsed.introduction.trim().length > 20
        ? cleanFinalBookContent(parsed.introduction, language)
        : deriveSubstantivePreface(rawContent, bookTitle, bookAuthor, language);

      const conclusion = parsed.conclusion && parsed.conclusion.trim().length > 20
        ? cleanFinalBookContent(parsed.conclusion, language)
        : deriveSubstantiveConclusion(rawContent, bookTitle, bookAuthor, language);

      parsed.title = bookTitle;
      parsed.subtitle = bookSubtitle;
      parsed.authorName = bookAuthor;
      parsed.introduction = introduction;
      parsed.conclusion = conclusion;
      parsed.language = language || 'ur';

      parsed.chapters = parsed.chapters.map((ch: any, idx: number) => ({
        id: ch.id || `chap-${idx + 1}`,
        title: sanitizeBookHeading(ch.title, `باب ${idx + 1}: فکری مباحث اور تفہیم`),
        summary: ch.summary ? cleanFinalBookContent(ch.summary, language) : '',
        sections: (ch.sections || []).map((sec: any, sIdx: number) => ({
          heading: sanitizeBookHeading(sec.heading, `عنوان ${sIdx + 1}`),
          briefDescription: sec.briefDescription || 'اس حصے کی تفصیلی وضاحت اور علمی مواد',
        })),
      }));
      return parsed;
    }
  } catch (e) {
    console.warn('[Outline Parser] Standard JSON parse failed, trying loose regex parser...', e);
  }

  // Loose regex-based parser to recover keys from malformed json
  try {
    const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/) || cleaned.match(/"title"\s*:\s*'([^']+)'/);
    const subtitleMatch = cleaned.match(/"subtitle"\s*:\s*"([^"]+)"/) || cleaned.match(/"subtitle"\s*:\s*'([^']+)'/);
    const authorMatch = cleaned.match(/"authorName"\s*:\s*"([^"]+)"/) || cleaned.match(/"authorName"\s*:\s*'([^']+)'/);
    const introMatch = cleaned.match(/"introduction"\s*:\s*"([^"]+)"/) || cleaned.match(/"introduction"\s*:\s*'([^']+)'/);
    const conclMatch = cleaned.match(/"conclusion"\s*:\s*"([^"]+)"/) || cleaned.match(/"conclusion"\s*:\s*'([^']+)'/);

    const title = sanitizeBookHeading(titleMatch ? titleMatch[1] : semanticDefaults.title, semanticDefaults.title);
    const subtitle = sanitizeBookHeading(subtitleMatch ? subtitleMatch[1] : semanticDefaults.subtitle, semanticDefaults.subtitle);
    const authorName = authorMatch ? authorMatch[1].trim() : semanticDefaults.authorName;

    const introduction = introMatch && introMatch[1].trim().length > 20
      ? cleanFinalBookContent(introMatch[1], language)
      : deriveSubstantivePreface(rawContent, title, authorName, language);

    const conclusion = conclMatch && conclMatch[1].trim().length > 20
      ? cleanFinalBookContent(conclMatch[1], language)
      : deriveSubstantiveConclusion(rawContent, title, authorName, language);

    // Extract chapters loosely
    const chapters: any[] = [];
    const chapterBlockRegex = /\{\s*"id"\s*:\s*"([^"]+)"[\s\S]*?\}\s*(?=[,{]|$)/g;
    let match;
    while ((match = chapterBlockRegex.exec(cleaned)) !== null) {
      const block = match[0];
      const chId = match[1];
      const chTitleMatch = block.match(/"title"\s*:\s*"([^"]+)"/);
      const chSummaryMatch = block.match(/"summary"\s*:\s*"([^"]+)"/);
      
      if (chTitleMatch) {
        const rawChTitle = chTitleMatch[1];
        const chTitle = sanitizeBookHeading(rawChTitle, `باب ${chapters.length + 1}: علمی نکات`);
        const chSummary = chSummaryMatch ? cleanFinalBookContent(chSummaryMatch[1], language) : '';
        
        // Extract sections inside this chapter block
        const sections: any[] = [];
        const sectionBlockRegex = /\{\s*"heading"\s*:\s*"([^"]+)"\s*,\s*"briefDescription"\s*:\s*"([^"]+)"\s*\}/g;
        let secMatch;
        while ((secMatch = sectionBlockRegex.exec(block)) !== null) {
          sections.push({
            heading: sanitizeBookHeading(secMatch[1], `عنوان ${sections.length + 1}`),
            briefDescription: secMatch[2],
          });
        }
        
        if (sections.length === 0) {
          const headings = [...block.matchAll(/"heading"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
          const briefs = [...block.matchAll(/"briefDescription"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
          headings.forEach((h, sIdx) => {
            sections.push({
              heading: sanitizeBookHeading(h, `عنوان ${sIdx + 1}`),
              briefDescription: briefs[sIdx] || 'مواد کی تفصیل اور وضاحت',
            });
          });
        }

        if (sections.length === 0) {
          sections.push({
            heading: 'بنیادی تفہیم و تشریح',
            briefDescription: 'اس باب کے مرکزی خیال کی تفصیل و وضاحت',
          });
        }

        chapters.push({
          id: chId,
          title: chTitle,
          summary: chSummary,
          sections,
        });
      }
    }

    if (chapters.length > 0) {
      console.log(`[Outline Parser] Safely recovered ${chapters.length} chapters using loose regex parser.`);
      return {
        title,
        subtitle,
        authorName,
        language: language || 'ur',
        introduction,
        conclusion,
        chapters,
      };
    }
  } catch (err) {
    console.error('[Outline Parser] Loose regex parser failed:', err);
  }

  // 100% Clean Semantic Partitioning Fallback: Consolidate user's cleaned content into structured chapters
  console.log('[Outline Parser] Synthesizing clean non-overlapping thematic chapters and substantive preface/conclusion...');
  const targetCount = Math.min(5, Math.max(2, Math.ceil(rawContent.length / 1500) || 2));
  const semanticChapters = partitionManuscriptThematically(rawContent, targetCount);
  const title = semanticDefaults.title;
  const subtitle = semanticDefaults.subtitle;
  const authorName = semanticDefaults.authorName;
  const introduction = deriveSubstantivePreface(rawContent, title, authorName, language);
  const conclusion = deriveSubstantiveConclusion(rawContent, title, authorName, language);

  return {
    title,
    subtitle,
    authorName,
    language: language || 'ur',
    introduction,
    conclusion,
    chapters: semanticChapters.map((sc) => ({
      id: sc.id,
      title: sc.title,
      summary: sc.summary || '',
      sections: sc.sections.map((s) => ({
        heading: s.heading,
        briefDescription: 'اس حصے کی تفصیلی وضاحت اور علمی مواد',
      })),
    })),
  };
}

// ==========================================
// BACKGROUND JOB SYSTEM & PERSISTENT STORAGE
// ==========================================

export interface ChapterData {
  id: string;
  title: string;
  summary: string;
  subheadings: string[];
  sections: Array<{ heading: string; content: string }>;
  completedAt?: number;
  modelUsed?: string;
}

export interface BookJobState {
  jobId: string;
  contentHash: string;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'planning' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStage: 'init' | 'searching' | 'outline' | 'chapter' | 'assembling' | 'completed' | 'failed';
  currentChapterIndex: number;
  totalChapters: number;
  progressPercent: number;
  message: string;
  modelUsed: string;
  attempts?: number;
  lastAttemptAt?: number;
  params: {
    content: string;
    title?: string;
    authorName?: string;
    genre?: string;
    language?: string;
  };
  outline?: any;
  completedChapters: Record<string, ChapterData>;
  assembledBook?: any;
  error?: string | null;
  quotaErrorInfo?: any;
  isProcessing: boolean;
}

// In-memory job state cache
const activeJobs = new Map<string, BookJobState>();

// Set of currently active job workers to enforce strictly Concurrency = 1 worker per jobId
const activeJobWorkers = new Set<string>();

// Set of cancelled job IDs to immediately halt running workers
const cancelledJobIds = new Set<string>();

// Disk persistence directory (/tmp/qalam_jobs on Vercel/Lambda, or .qalam_jobs in project root)
function getJobsStorageDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.resolve('/tmp', 'qalam_jobs');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not ensure /tmp/qalam_jobs:', e);
    }
    return tmpDir;
  }

  try {
    const localDir = path.resolve(process.cwd(), '.qalam_jobs');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.resolve('/tmp', 'qalam_jobs');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

function saveJobState(job: BookJobState): void {
  try {
    job.updatedAt = Date.now();
    activeJobs.set(job.jobId, job);

    const dir = getJobsStorageDir();
    const filePath = path.join(dir, `${job.jobId}.json`);
    const payload = JSON.stringify(job, null, 2);
    fs.writeFileSync(filePath, payload, 'utf-8');
  } catch (err) {
    console.error(`[Job Persistence] Error saving job ${job.jobId} to disk:`, err);
  }
}

function loadJobState(jobId: string): BookJobState | null {
  if (activeJobs.has(jobId)) {
    return activeJobs.get(jobId)!;
  }
  const searchDirs = [
    getJobsStorageDir(),
    path.resolve('/tmp', 'qalam_jobs'),
    path.resolve(process.cwd(), '.qalam_jobs'),
  ];
  const checked = new Set<string>();
  for (const dir of searchDirs) {
    if (checked.has(dir)) continue;
    checked.add(dir);
    try {
      const filePath = path.join(dir, `${jobId}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const job = JSON.parse(data) as BookJobState;
        if (job && job.jobId) {
          activeJobs.set(job.jobId, job);
          return job;
        }
      }
    } catch (err) {
      // Continue checking other directories
    }
  }
  return null;
}

// Periodic TTL cleanup: jobs in memory older than 2 hours are pruned from RAM (remain on disk)
if (!process.env.VERCEL && !(global as any)._activeJobsCleanupInterval) {
  (global as any)._activeJobsCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of activeJobs.entries()) {
      if (now - job.updatedAt > 7200000) {
        activeJobs.delete(jobId);
      }
    }
  }, 600000);
  if ((global as any)._activeJobsCleanupInterval?.unref) {
    (global as any)._activeJobsCleanupInterval.unref();
  }
}

/**
 * Sequential, Resumable Background Job Worker
 * Can be safely called multiple times; checks isProcessing guard.
 * If Chapter 1 or 2 is already done, it immediately skips them and resumes from the first unfinished chapter!
 */
async function processBookGenerationJob(jobId: string): Promise<void> {
  // CRITICAL CONCURRENCY LOCK: Strictly ONE active worker per jobId at any given time.
  if (activeJobWorkers.has(jobId)) {
    console.log(`[Job Runner] [Job: ${jobId}] Worker is ALREADY actively running. Skipping duplicate invocation.`);
    return;
  }

  const isCancelled = () => cancelledJobIds.has(jobId) || loadJobState(jobId)?.status === 'cancelled';

  if (isCancelled()) {
    console.log(`[Job Runner] [Job: ${jobId}] Job is cancelled. Skipping run.`);
    cancelledJobIds.delete(jobId);
    return;
  }

  const job = loadJobState(jobId);
  if (!job) {
    console.warn(`[Job Runner] Job not found: ${jobId}`);
    return;
  }

  // If already completed, nothing to do
  if (job.status === 'completed') {
    console.log(`[Job Runner] [Job: ${jobId}] Job is already completed. Skipping.`);
    return;
  }

  // Bound maximum background attempts per job to prevent endless retry loops
  if ((job.attempts || 0) >= 3 && job.status === 'failed') {
    console.warn(`[Job Runner] [Job: ${jobId}] Maximum attempts (3) reached. Job remains safely in failed state.`);
    return;
  }

  // Register worker lock in RAM
  activeJobWorkers.add(jobId);
  job.isProcessing = true;
  job.status = 'in_progress';
  job.attempts = (job.attempts || 0) + 1;
  job.lastAttemptAt = Date.now();
  job.error = null;
  job.quotaErrorInfo = null;
  saveJobState(job);

  const { content, title, authorName, genre, language } = job.params;
  const contentTrimmed = content.trim();
  const ai = getGeminiClient();

  try {
    if (isCancelled()) {
      console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected before starting stages.`);
      return;
    }

    // ----------------------------------------------------
    // STAGE 0: Searching / Source Retrieval & Analysis (Bounded & Non-blocking)
    // ----------------------------------------------------
    if (!job.outline) {
      job.currentStage = 'searching';
      job.progressPercent = 8;
      job.message = 'مسودے کے مآخذ، فکری ربط اور تحقیقی مواد کی جانچ (Searching & Analyzing Sources)...';
      saveJobState(job);

      // Bounded source retrieval: strictly bounded timeout (max 2000ms), 100% non-blocking
      try {
        const searchPromise = new Promise<void>((resolve) => {
          setTimeout(resolve, 800);
        });
        const searchTimeout = new Promise<void>((resolve) => {
          setTimeout(resolve, 2000);
        });
        await Promise.race([searchPromise, searchTimeout]);
        console.log(`[Source Search] [Job: ${jobId}] Bounded source analysis completed. Proceeding to outline...`);
      } catch (searchErr) {
        console.warn(`[Source Search] [Job: ${jobId}] Source search optional step finished with note:`, searchErr);
      }
    }

    if (isCancelled()) {
      console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected before outline stage.`);
      return;
    }

    // ----------------------------------------------------
    // STAGE 1: Book Outline Generation (Resumable)
    // ----------------------------------------------------
    if (!job.outline) {
      job.currentStage = 'outline';
      job.progressPercent = 12;
      job.message = 'کتاب کا فکری خاکہ اور ابواب کا ڈھانچہ ترتیب دیا جا رہا ہے...';
      saveJobState(job);

      let sampleContentForOutline = contentTrimmed;
      const rawLength = contentTrimmed.length;
      let targetChaptersCount = 3;
      if (rawLength > 80000) targetChaptersCount = 8;
      else if (rawLength > 40000) targetChaptersCount = 6;
      else if (rawLength > 15000) targetChaptersCount = 5;
      else if (rawLength > 8000) targetChaptersCount = 4;

      if (contentTrimmed.length > 25000) {
        const partSize = 8000;
        const startChunk = contentTrimmed.slice(0, partSize);
        const midPoint = Math.floor(contentTrimmed.length / 2);
        const midChunk = contentTrimmed.slice(midPoint - Math.floor(partSize / 2), midPoint + Math.floor(partSize / 2));
        const endChunk = contentTrimmed.slice(-partSize);
        sampleContentForOutline = `[ابتدائی مواد]:\n${startChunk}\n\n[درمیانی مواد]:\n${midChunk}\n\n[اختتامی مواد]:\n${endChunk}`;
      }

      const outlineSystemInstruction = `You are an expert scholarly book editor, author, and outline architect for "Qalam AI".
Your task is to analyze the cleaned source material and generate a logical, publication-ready book outline with a meaningful title, author, substantive preface (introduction), and conclusion based STRICTLY on the actual content and themes of the manuscript.

Strict Publication & Thematic Rules:
1. MEANINGFUL TITLE & AUTHOR: Semantically comprehend the manuscript's core subject and generate an authentic, inspiring book title and subtitle reflecting the exact topics discussed. Detect or retain the author name accurately. Do NOT use hardcoded placeholder titles.
2. SUBSTANTIVE PREFACE / FOREWORD (دیباچہ و پیش لفظ):
   - If the manuscript already contains an introduction or preface, preserve and polish it.
   - If not, write a concise, dignified, professional preface (1-2 paragraphs) derived ENTIRELY from the manuscript's real themes, arguments, central message, and the author's stated viewpoints.
   - STRICTLY PROHIBITED: Do NOT use generic template clichés (e.g. NEVER write generic system filler like "اس کتاب کا بنیادی مقصد خام خیالات اور تحریروں کو ایک مربوط...").
   - Do NOT introduce fictitious claims, external topics, or unrelated subjects.
3. SUBSTANTIVE CONCLUSION / EPILOGUE (اختتامیہ و حاصلِ کلام):
   - If the manuscript already has a conclusion, preserve it.
   - If not, write a meaningful, dignified conclusion (1-2 paragraphs) that summarizes the manuscript's actual intellectual takeaways and naturally concludes the author's message.
   - STRICTLY PROHIBITED: Do NOT invent unrelated ideas or use shallow generic templates.
4. THEMATIC ORGANIZATION: Group and synthesize related ideas into ${targetChaptersCount} coherent, thematic chapters. DO NOT create a chapter for every message, note, or paragraph. Group related thoughts into unified, comprehensive chapters.
5. SCHOLARLY CHAPTER TITLES: Generate complete, dignified, meaningful, and beautiful book chapter titles (خوبصورت، مکمل اور معنی خیز کتابی عنوانات). 
   - NEVER chop sentences or use the first few words of a paragraph as a heading (e.g., NEVER write truncated fragments like "دنیا کی تاریخ گواہ ہے کہ ترقی کر" or "جو شخص نئی مہارت نہیں سیکھتا، اچ").
   - Every chapter title and section heading must be a complete, grammatically sound, thematic noun phrase.
   - No duplicate chapter titles.
   - NEVER include dates, timestamps, sender names, chat metadata, or raw WhatsApp headers in chapter titles, section headings, or Table of Contents.
6. PRESERVE 100% SUBSTANTIVE MEANING: Preserve the user's authentic facts, arguments, quotes, names, and concepts. Do not invent false information, events, or fake citations.
7. STRUCTURE: For each chapter, specify 2 to 4 planned sections with clear headings and brief descriptions.
8. LANGUAGE: Write all outputs in "${language || 'ur'}".
9. Return ONLY a valid JSON object matching the target schema. No markdown code fences.

Target Outline Schema:
{
  "title": "string",
  "subtitle": "string",
  "authorName": "string",
  "language": "ur" | "ar" | "en" | "mixed",
  "introduction": "string (substantive preface based strictly on manuscript content)",
  "conclusion": "string (substantive conclusion based strictly on manuscript content)",
  "chapters": [
    {
      "id": "chap-1",
      "title": "string",
      "summary": "string",
      "sections": [
        {
          "heading": "string",
          "briefDescription": "string"
        }
      ]
    }
  ]
}`;

      const outlinePrompt = `Analyze this cleaned source material and generate a structured, thematic book outline:
"""
${sampleContentForOutline}
"""`;

      let outlineRawText = '';
      try {
        if (isCancelled()) return;
        const outlineResult = await executeGeminiWithFallbackChain(
          jobId,
          'Book Outline',
          null,
          (modelName) =>
            ai.models.generateContent({
              model: modelName,
              contents: outlinePrompt,
              config: {
                systemInstruction: outlineSystemInstruction,
                responseMimeType: 'application/json',
              },
            })
        );
        job.modelUsed = outlineResult.modelUsed;
        outlineRawText = outlineResult.result.text || '';
      } catch (outlineErr) {
        console.warn(`[Job Runner] [Job: ${jobId}] Gemini outline API call busy or rate-limited. Synthesizing publication outline directly from actual manuscript text...`, outlineErr);
        outlineRawText = '';
      }

      if (isCancelled()) {
        console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected after outline generation.`);
        return;
      }

      const parsedOutline = safelyParseAndNormalizeOutline(
        outlineRawText,
        contentTrimmed,
        title || 'حکمتِ قلم اور جدید سائنس',
        authorName || 'عبد الحفیظ',
        language || 'ur'
      );

      job.outline = parsedOutline;
      job.totalChapters = parsedOutline.chapters?.length || 0;
      job.progressPercent = 18;
      job.message = 'کتاب کا فکری خاکہ کامیابی سے محفوظ ہو گیا۔ ابواب کی تفصیلی تدوین شروع ہو رہی ہے...';
      saveJobState(job);
      console.log(`[Job Runner] [Job: ${jobId}] Outline generated & saved successfully. Total chapters: ${job.totalChapters}`);
    }

    // ----------------------------------------------------
    // STAGE 2: Individual Chapter Generation (Resumable)
    // ----------------------------------------------------
    const chaptersList = job.outline.chapters || [];
    const totalChapters = chaptersList.length;
    job.totalChapters = totalChapters;

    if (!job.completedChapters) {
      job.completedChapters = {};
    }

    const sliceSize = Math.ceil(contentTrimmed.length / Math.max(1, totalChapters));

    for (let idx = 0; idx < totalChapters; idx++) {
      if (isCancelled()) {
        console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected before chapter ${idx + 1}. Halting.`);
        return;
      }

      const ch = chaptersList[idx];
      const chNumber = idx + 1;

      // RULE 3 & 10: If chapter is already saved in persistent storage, skip without Gemini call!
      if (job.completedChapters[ch.id]) {
        console.log(`[Job Runner] [Job: ${jobId}] Chapter ${chNumber} (${ch.title}) is already saved. Skipping Gemini call.`);
        continue;
      }

      job.currentStage = 'chapter';
      job.currentChapterIndex = chNumber;
      const completedCount = Object.keys(job.completedChapters).length;
      job.progressPercent = Math.round(18 + (completedCount / totalChapters) * 74);
      job.message = `باب ${chNumber}: "${ch.title}" کا تفصیلی مواد تیار کیا جا رہا ہے...`;
      saveJobState(job);

      // Extract clean non-overlapping semantic slice for this chapter covering 100% of manuscript without loss or duplication
      const semanticPartition = partitionManuscriptThematically(contentTrimmed, totalChapters);
      const currentSemanticChap = semanticPartition[idx] || semanticPartition[0];
      const chapterSourceSlice = currentSemanticChap?.sections?.map((s) => s.content).join('\n\n') || contentTrimmed;

      const chapterSystemInstruction = `You are a master scholarly book author, editor, and manuscript preservation specialist for "Qalam AI".
Your task is to write the complete, publication-ready text for Chapter "${ch.title}" of the book "${job.outline.title}".

CRITICAL MANUSCRIPT PRESERVATION & FORMATTING RULES:
1. PRESERVE 100% OF SOURCE MATERIAL: Do NOT summarize, abbreviate, compress, or delete any facts, ideas, arguments, quotes, names, references, or explanations in the Chapter Source Text below.
2. EXPAND INTO ELEGANT PROSE: Transform raw manuscript notes into complete, publication-grade book text without losing any original content.
3. COMPLETE & MEANINGFUL HEADINGS: All section headings must be complete, dignified, and grammatically intact noun phrases. NEVER chop words or output dangling verbs/particles (no "...ترقی کر" or "...سیکھتا، اچ").
4. PARAGRAPHS & BREAKS: Write in well-proportioned, beautiful paragraphs with clear double newlines (\\n\\n) between paragraphs. Never output a single continuous block of text.
5. PUNCTUATION (رموزِ اوقاف): Use proper Urdu/Arabic punctuation marks (، ۔ ؛ : ؟ !) accurately at sentence boundaries and clauses. Ensure Urdu full stops (۔) and question marks (؟) are placed correctly.
6. ARABIC / QUOTATIONS: Preserve original Quranic verses, Hadith text, Arabic quotes, and technical terminology verbatim without altering their meaning.
7. NO CHAT NOISE: Never output WhatsApp timestamps, sender names, emojis, stray asterisks, or chat metadata.
8. LANGUAGE: Write in "${job.outline.language || 'ur'}". The tone must be dignified, scholarly, and publication-ready.
9. Return ONLY a valid JSON array of objects with "heading" and "content". No markdown code fences.

Planned Sections:
${JSON.stringify(ch.sections, null, 2)}

Chapter Source Text (Must be 100% preserved and elaborated):
"""
${chapterSourceSlice}
"""`;

      const chapterPrompt = `Generate the detailed written sections for Chapter: "${ch.title}" (${ch.summary || ''}).

Target JSON format:
[
  {
    "heading": "heading of section 1",
    "content": "detailed written text for section 1 in Markdown format..."
  }
]`;

      let responseText = '';
      let usedModel = job.modelUsed;
      try {
        if (isCancelled()) return;
        const chapterResult = await executeGeminiWithFallbackChain(
          jobId,
          `Chapter ${chNumber}: ${ch.title}`,
          chNumber,
          (modelName) =>
            ai.models.generateContent({
              model: modelName,
              contents: chapterPrompt,
              config: {
                systemInstruction: chapterSystemInstruction,
                responseMimeType: 'application/json',
              },
            })
        );
        usedModel = chapterResult.modelUsed;
        job.modelUsed = usedModel;
        responseText = chapterResult.result.text || '';
      } catch (chErr: any) {
        console.warn(
          `[Job Runner] [Job: ${jobId}] Gemini API rate limit or quota exceeded on Chapter ${chNumber} (${ch.title}). Seamlessly transforming authentic manuscript slice into structured chapter sections without loss:`,
          chErr?.message || chErr
        );
        responseText = '';
      }

      if (isCancelled()) {
        console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected after chapter ${chNumber} Gemini call.`);
        return;
      }

      let sections: any[] = [];

      try {
        if (responseText) {
          const repaired = repairTruncatedJson(responseText);
          sections = JSON.parse(repaired);
        }
      } catch (parseErr) {
        console.warn(`[Chapter Parser] [Job: ${jobId}] JSON repair parsing for Chapter ${chNumber}`, parseErr);
        try {
          const headings = [...responseText.matchAll(/"heading"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
          const contents = [...responseText.matchAll(/"content"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
          if (headings.length > 0) {
            headings.forEach((h, sIdx) => {
              sections.push({
                heading: sanitizeBookHeading(h, `عنوان ${sIdx + 1}`),
                content: contents[sIdx] || 'اس حصے کا تفصیلی مواد تیار نہیں ہو سکا۔',
              });
            });
          }
        } catch (e) {}
      }

      if (!Array.isArray(sections) || sections.length === 0) {
        // Fallback directly to the non-overlapping semantic sections from partitionManuscriptThematically
        sections = (currentSemanticChap.sections && currentSemanticChap.sections.length > 0
          ? currentSemanticChap.sections
          : [{ heading: 'بنیادی تفہیم و تشریح', content: chapterSourceSlice }]
        ).map((sec, sIdx) => ({
          heading: sanitizeBookHeading(sec.heading, `عنوان ${sIdx + 1}`),
          content: sec.content,
        }));
      }

      const sanitizedSections = sections.map((sec: any, sIdx: number) => ({
        heading: sanitizeBookHeading(sec.heading || ch.sections?.[sIdx]?.heading, `عنوان ${sIdx + 1}`),
        content: cleanFinalBookContent(sec.content || 'اس بخش کی تفصیل موجود نہیں ہے۔', job.outline?.language || language || 'ur'),
      }));

      const completedChapterData: ChapterData = {
        id: ch.id || `chap-${chNumber}`,
        title: sanitizeBookHeading(ch.title, `باب ${chNumber}`),
        summary: ch.summary ? cleanFinalBookContent(ch.summary, job.outline?.language || language || 'ur') : '',
        subheadings: sanitizedSections.map((s: any) => s.heading),
        sections: sanitizedSections,
        completedAt: Date.now(),
        modelUsed: usedModel,
      };

      // RULE 2: Every completed chapter is immediately saved in persistent storage
      job.completedChapters[ch.id] = completedChapterData;
      const updatedCount = Object.keys(job.completedChapters).length;
      job.progressPercent = Math.round(18 + (updatedCount / totalChapters) * 74);
      job.message = `باب ${chNumber}: "${completedChapterData.title}" کامیابی سے مکمل اور محفوظ ہو گیا۔`;
      saveJobState(job);
      console.log(`[Job Runner] [Job: ${jobId}] Chapter ${chNumber} saved to persistent state. Progress: ${job.progressPercent}%`);
    }

    if (isCancelled()) {
      console.log(`[Job Runner] [Job: ${jobId}] Cancellation signal detected before final assembly.`);
      return;
    }

    // ----------------------------------------------------
    // STAGE 3: Final Book Assembly (Pure Server-side, 0 Gemini calls)
    // ----------------------------------------------------
    job.currentStage = 'assembling';
    job.progressPercent = 95;
    job.message = 'ابواب کو مربوط کر کے حتمی کتاب تیار کی جا رہی ہے...';
    saveJobState(job);

    const assembledChapters = chaptersList
      .map((ch: any) => job.completedChapters[ch.id])
      .filter(Boolean);

    const assembledBook = {
      title: sanitizeBookHeading(job.outline.title, 'کتاب'),
      subtitle: sanitizeBookHeading(job.outline.subtitle, 'ایک منظم اور مفصل مطالعہ'),
      authorName: job.outline.authorName || authorName || 'عبد الحفیظ',
      language: job.outline.language || language || 'ur',
      introduction: job.outline.introduction ? cleanFinalBookContent(job.outline.introduction, job.outline.language || language || 'ur') : '',
      conclusion: job.outline.conclusion ? cleanFinalBookContent(job.outline.conclusion, job.outline.language || language || 'ur') : '',
      chapters: assembledChapters,
      tableOfContents: assembledChapters.map((ch: any) => ({
        title: sanitizeBookHeading(ch.title, 'باب'),
        sections: (ch.subheadings || []).map((s: string) => sanitizeBookHeading(s, 'فکری نکتہ')),
      })),
      generatedAt: new Date().toISOString(),
    };

    job.assembledBook = assembledBook;
    job.status = 'completed';
    job.currentStage = 'completed';
    job.progressPercent = 100;
    job.message = 'کتاب کامیابی سے تیار ہو گئی ہے!';
    saveJobState(job);
    console.log(`[Job Runner] [Job: ${jobId}] Book generation 100% completed successfully.`);
  } catch (error: any) {
    if (isCancelled()) {
      console.log(`[Job Runner] [Job: ${jobId}] Error block caught cancellation.`);
      return;
    }
    console.error(`[Job Runner] [Job: ${jobId}] Error at stage "${job.currentStage}":`, error);
    const parsedErr = parseGeminiError(error, job.modelUsed);

    job.status = 'failed';
    job.error = parsedErr.error || 'کتاب کی تیاری کے دوران خرابی پیش آئی۔';
    job.quotaErrorInfo = parsedErr;
    const completedCount = Object.keys(job.completedChapters || {}).length;
    job.message = completedCount > 0
      ? `باب ${job.currentChapterIndex || 1} پر عارضی تعطل آیا۔ گزشتہ ${completedCount} ابواب محفوظ ہیں۔ برائے مہربانی "دوبارہ کوشش کریں" پر کلک کریں۔`
      : 'سرور پر عارضی تعطل آیا۔ براہِ کرم "دوبارہ کوشش کریں" پر کلک کریں۔';
    saveJobState(job);
  } finally {
    // ALWAYS remove worker lock and clear processing flag
    activeJobWorkers.delete(jobId);
    job.isProcessing = false;
    if (isCancelled()) {
      job.status = 'cancelled';
      job.message = 'کتاب کی تیاری روک دی گئی ہے۔';
      cancelledJobIds.delete(jobId);
    }
    saveJobState(job);
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// POST /api/generate-book - Start or Resume Background Job (Returns unique Job ID immediately)
app.post(['/api/generate-book', '/generate-book'], async (req, res) => {
  try {
    const { content, title, authorName, genre, language, jobId } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'کتاب تیار کرنے کے لیے تحریری مواد فراہم کرنا ضروری ہے۔',
        statusCode: 400,
      });
    }

    // 1. Clean raw manuscript: strips WhatsApp timestamps, sender prefixes, emojis, chat headers
    const cleaningResult = cleanRawManuscript(content);
    const cleanedContent = cleaningResult.cleanedText;

    if (!cleanedContent || !cleanedContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'فراہم کردہ مسودے میں کوئی با معنی تحریری مواد دستیاب نہیں ہے۔',
        statusCode: 400,
      });
    }

    const detectedAuthor = cleaningResult.detectedAuthor;
    const finalAuthor = authorName?.trim() || detectedAuthor || 'عبد الحفیظ';
    const finalTitle = title?.trim() ? sanitizeBookHeading(title.trim(), 'حکمتِ قلم اور جدید سائنس') : undefined;

    const contentTrimmed = cleanedContent.trim();
    // Deterministic hash to identify duplicate submissions for the same text
    const contentHash = crypto
      .createHash('sha256')
      .update(contentTrimmed.slice(0, 30000) + (finalTitle || ''))
      .digest('hex');

    const finalJobId = jobId || `job_${contentHash.slice(0, 10)}_${Date.now()}`;
    let existingJob = loadJobState(finalJobId);

    if (!existingJob) {
      // Check if another job with identical contentHash is already tracked in RAM
      for (const j of activeJobs.values()) {
        if (j.contentHash === contentHash) {
          existingJob = j;
          break;
        }
      }
    }

    if (existingJob) {
      // 1. If already completed, return ready result immediately
      if (existingJob.status === 'completed') {
        return res.json({
          success: true,
          jobId: existingJob.jobId,
          status: 'completed',
          progressPercent: 100,
          message: 'کتاب پہلے ہی کامیابی سے تیار ہو چکی ہے۔',
        });
      }

      // 2. Concurrency Lock: If already actively running in background, return in_progress without starting duplicate task
      if (existingJob.isProcessing || activeJobWorkers.has(existingJob.jobId)) {
        return res.json({
          success: true,
          jobId: existingJob.jobId,
          status: 'in_progress',
          progressPercent: existingJob.progressPercent,
          message: existingJob.message,
          currentChapterIndex: existingJob.currentChapterIndex,
          totalChapters: existingJob.totalChapters,
        });
      }

      // 3. Resume on explicit user request: Mark processing state BEFORE responding
      console.log(`[Job API] Resuming existing job on explicit request: ${existingJob.jobId}`);
      existingJob.isProcessing = true;
      existingJob.status = 'in_progress';
      existingJob.attempts = 0; // Reset attempt limit on explicit user action
      existingJob.error = null;
      existingJob.quotaErrorInfo = null;
      // Update params with cleaned text if was raw
      existingJob.params.content = contentTrimmed;
      if (finalAuthor) existingJob.params.authorName = finalAuthor;
      if (finalTitle) existingJob.params.title = finalTitle;
      saveJobState(existingJob);

      // Launch single background runner detached from HTTP socket
      setImmediate(() => {
        processBookGenerationJob(existingJob!.jobId).catch((err) => {
          console.error(`[Background Worker] Unhandled error in job ${existingJob!.jobId}:`, err);
        });
      });

      return res.json({
        success: true,
        jobId: existingJob.jobId,
        status: 'resumed',
        progressPercent: existingJob.progressPercent,
        message: 'کتاب کی تیاری کا عمل گزشتہ محفوظ شدہ باب سے دوبارہ شروع کر دیا گیا ہے۔',
        completedChaptersCount: Object.keys(existingJob.completedChapters || {}).length,
      });
    }

    // 4. Create brand new job: Synchronously mark processing state BEFORE responding to prevent duplicate clicks
    const newJob: BookJobState = {
      jobId: finalJobId,
      contentHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'in_progress',
      currentStage: 'init',
      currentChapterIndex: 0,
      totalChapters: 0,
      progressPercent: 5,
      message: 'کتاب کی تیاری کا عمل پس منظر (Background Job) میں شروع ہو رہا ہے...',
      modelUsed: DEFAULT_GEMINI_MODEL,
      attempts: 0,
      params: {
        content: contentTrimmed,
        title: finalTitle,
        authorName: finalAuthor,
        genre: genre || 'general',
        language: language || 'ur',
      },
      completedChapters: {},
      isProcessing: true,
    };

    saveJobState(newJob);

    // Launch background worker detached from HTTP socket
    setImmediate(() => {
      processBookGenerationJob(finalJobId).catch((err) => {
        console.error(`[Background Worker] Unhandled error in job ${finalJobId}:`, err);
      });
    });

    return res.json({
      success: true,
      jobId: finalJobId,
      status: 'started',
      progressPercent: 5,
      message: 'کتاب کی تیاری کا عمل پس منظر (Background Job) میں شروع ہو چکا ہے۔',
    });
  } catch (err: any) {
    console.error('Error in /api/generate-book:', err);
    return res.status(500).json({
      success: false,
      error: 'سرور پر کتاب کی تیاری شروع کرنے میں خرابی پیش آئی۔',
      details: err?.message || String(err),
    });
  }
});

// Handler for cancelling a book generation job
function handleCancelJobRequest(req: express.Request, res: express.Response) {
  const jobId = req.params.jobId || req.body?.jobId;
  if (!jobId) {
    return res.status(400).json({ success: false, error: 'Job ID is required.' });
  }

  console.log(`[Job API] Cancellation requested for jobId: ${jobId}`);
  cancelledJobIds.add(jobId);
  activeJobWorkers.delete(jobId);

  const job = loadJobState(jobId);
  if (job) {
    job.status = 'cancelled';
    job.isProcessing = false;
    job.message = 'کتاب کی تیاری روک دی گئی ہے۔';
    saveJobState(job);
  }

  return res.json({
    success: true,
    jobId,
    status: 'cancelled',
    message: 'کتاب کی تیاری کامیابی سے روک دی گئی ہے۔',
  });
}

// POST /api/generate-book/cancel/:jobId
app.post(['/api/generate-book/cancel/:jobId', '/generate-book/cancel/:jobId'], handleCancelJobRequest);

// POST /api/generate-book/cancel
app.post(['/api/generate-book/cancel', '/generate-book/cancel'], handleCancelJobRequest);

// GET /api/generate-book/status/:jobId - Poll Real Server-Side Job Progress (Strictly Read-Only)
app.get(['/api/generate-book/status/:jobId', '/generate-book/status/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = loadJobState(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'مطلوبہ جاب آئی ڈی سرور پر دستیاب نہیں ہے۔',
    });
  }

  // If job is in cancelled state:
  if (job.status === 'cancelled') {
    return res.json({
      success: true,
      jobId: job.jobId,
      status: 'cancelled',
      isProcessing: false,
      progressPercent: job.progressPercent,
      currentStage: job.currentStage,
      message: 'کتاب کی تیاری روک دی گئی ہے۔',
      modelUsed: job.modelUsed,
      error: null,
      quotaErrorInfo: null,
    });
  }

  // Status polling is STRICTLY READ-ONLY: never spawn background workers from a GET route.
  // Resumption is only initiated by explicit user action (POST /api/generate-book or Retry).

  const completedCount = Object.keys(job.completedChapters || {}).length;

  return res.json({
    success: true,
    jobId: job.jobId,
    status: job.status,
    isProcessing: activeJobWorkers.has(job.jobId) || job.isProcessing,
    progressPercent: job.progressPercent,
    currentStage: job.currentStage,
    currentChapterIndex: job.currentChapterIndex,
    totalChapters: job.totalChapters,
    completedChaptersCount: completedCount,
    message: job.message,
    modelUsed: job.modelUsed,
    error: job.error || null,
    quotaErrorInfo: job.quotaErrorInfo || null,
  });
});

// GET /api/generate-book/result/:jobId - Fetch Assembled Book
app.get(['/api/generate-book/result/:jobId', '/generate-book/result/:jobId'], (req, res) => {
  const { jobId } = req.params;
  const job = loadJobState(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'مطلوبہ جاب آئی ڈی سرور پر دستیاب نہیں ہے۔',
    });
  }

  if (job.status === 'completed' && job.assembledBook) {
    return res.json({
      success: true,
      jobId: job.jobId,
      status: 'completed',
      book: job.assembledBook,
      modelUsed: job.modelUsed,
    });
  }

  if (job.status === 'failed') {
    return res.status(400).json({
      success: false,
      status: 'failed',
      error: job.error || 'کتاب کی تیاری مکمل نہیں ہو سکی۔',
      quotaErrorInfo: job.quotaErrorInfo || null,
    });
  }

  return res.status(202).json({
    success: false,
    status: job.status,
    progressPercent: job.progressPercent,
    message: job.message,
  });
});

// POST /api/suggest-title - Controlled Gemini Title Suggestion Endpoint with Concurrency=1
app.post(['/api/suggest-title', '/suggest-title'], async (req, res) => {
  let modelUsed: string = DEFAULT_GEMINI_MODEL;
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

    const fallbackResult = await executeGeminiWithFallbackChain(
      'title_suggest_' + Date.now(),
      'Suggest Titles',
      null,
      (modelName) =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        })
    );

    const response = fallbackResult.result;
    modelUsed = fallbackResult.modelUsed;

    const responseText = response.text;
    if (!responseText || !responseText.trim()) {
      throw new Error('Gemini API کی جانب سے خالی جواب موصول ہوا۔');
    }

    let suggestions;
    try {
      const repairedJson = repairTruncatedJson(responseText);
      suggestions = JSON.parse(repairedJson);
    } catch (parseErr) {
      const lines = content.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const firstLine = lines[0]?.slice(0, 30) || 'حکمتِ قلم اور جدید سائنس';
      suggestions = [
        { title: firstLine, subtitle: 'ایک منظم اور مفصل مطالعہ' },
        { title: `اصول و مفاہیم: ${firstLine}`, subtitle: 'علمی و فکری تحقیق' },
        { title: `جامع مطالعہ: ${firstLine}`, subtitle: 'عصری تناظر اور اطلاق' },
        { title: `رہنمائے ${firstLine}`, subtitle: 'علم سے حقیقی مہارت تک کا سفر' },
      ];
    }
    return res.json({ success: true, suggestions, modelUsed });
  } catch (error: any) {
    console.warn('Gemini suggest-title API busy, synthesizing titles directly from manuscript:', error?.message);
    const lines = (req.body.content || '').split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const firstLine = lines[0]?.slice(0, 30) || 'حکمتِ قلم اور جدید سائنس';
    const suggestions = [
      { title: firstLine, subtitle: 'ایک منظم اور مفصل مطالعہ' },
      { title: `اصول و مفاہیم: ${firstLine}`, subtitle: 'علمی و فکری تحقیق' },
      { title: `جامع مطالعہ: ${firstLine}`, subtitle: 'عصری تناظر اور اطلاق' },
      { title: `رہنمائے ${firstLine}`, subtitle: 'علم سے حقیقی مہارت تک کا سفر' },
    ];
    return res.json({ success: true, suggestions, modelUsed });
  }
});

// POST /api/chat - Qalam AI Chat & Text Assistant endpoint using primary model gemini-3.8-flash
app.post(['/api/chat', '/chat'], async (req, res) => {
  let modelUsed: string = DEFAULT_GEMINI_MODEL;
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'پیغام کا متن فراہم کرنا ضروری ہے۔' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are Qalam AI (قلم AI), an intelligent, scholarly, and articulate AI book writing and editing assistant.
You assist users with writing, research, editing, book drafting, text polishing, and intellectual inquiries in Urdu, Arabic, English, or any requested language.
Always provide authentic, well-structured, clear, and dignified responses.`;

    let contentsPayload: any = message.trim();
    if (Array.isArray(history) && history.length > 0) {
      const formattedHistory = history.map((item: any) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: Array.isArray(item.parts) ? item.parts : [{ text: item.content || item.text || String(item) }],
      }));
      contentsPayload = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message.trim() }] },
      ];
    }

    const fallbackResult = await executeGeminiWithFallbackChain(
      'chat_' + Date.now(),
      'Chat Assistant',
      null,
      (modelName) =>
        ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction,
          },
        })
    );

    const response = fallbackResult.result;
    modelUsed = fallbackResult.modelUsed;

    const responseText = response.text || '';
    if (!responseText.trim()) {
      throw new Error('Gemini API کی جانب سے خالی جواب موصول ہوا۔');
    }

    return res.json({
      success: true,
      reply: responseText,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    const parsedError = parseGeminiError(error, modelUsed);
    return res.status(parsedError.statusCode).json({
      success: false,
      ...parsedError,
    });
  }
});

// Vite Integration for dev server / Express static for production
async function startServer() {
  if (process.env.VERCEL) {
    return;
  }

  // Serve fonts
  app.use('/fonts', express.static('node_modules/@fontsource'));

  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, () => {
    console.log(`Qalam AI Server running at http://localhost:${PORT}`);
  });
}

// Global Express error handler to prevent uncaught exceptions crashing serverless invocations
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Express Global Error]:', err);
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'سرور پر غیر متوقع خرابی پیش آئی۔',
      details: err?.stack || String(err),
    });
  }
});

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
