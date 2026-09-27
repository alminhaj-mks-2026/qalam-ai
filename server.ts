import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

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

// Helper to call Gemini API with limited exponential backoff for 503/UNAVAILABLE errors
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1200
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || '').toLowerCase();
      const status = err?.status || err?.code || err?.response?.status;
      const is503OrUnavailable =
        status === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('resourceexhausted') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('high demand') ||
        errMsg.includes('temporarily unavailable');

      if (is503OrUnavailable && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini API] Retry attempt ${attempt}/${maxRetries} after 503/UNAVAILABLE. Waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// POST /api/generate-book - Real Gemini Book Generation Endpoint
app.post('/api/generate-book', async (req, res) => {
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
        model: 'gemini-3.8-flash',
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

    // Clean potential markdown codeblock formatting if present
    const cleanedJson = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedBook;
    try {
      parsedBook = JSON.parse(cleanedJson);
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
      book: parsedBook,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-book:', error);
    const errMsg = String(error?.message || error || '');
    const is503 =
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('Overloaded') ||
      errMsg.includes('temporarily unavailable');

    const statusCode = is503 ? 503 : 500;
    const userFacingError = is503
      ? 'Gemini AI سرور اس وقت عارضی طور پر مصروف (503 Unavailable) ہے۔ برائے مہربانی چند لمحوں بعد "کتاب تیار کریں" پر دوبارہ کلک کریں۔'
      : (error.message || 'Gemini AI کے ساتھ رابطہ قائم نہیں ہو سکا۔');

    return res.status(statusCode).json({
      error: userFacingError,
    });
  }
});

// POST /api/suggest-title - Real Gemini Title Suggestion Endpoint
app.post('/api/suggest-title', async (req, res) => {
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
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    const cleanedJson = (responseText || '[]')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const suggestions = JSON.parse(cleanedJson);
    return res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Error in /api/suggest-title:', error);
    return res.status(500).json({
      error: error.message || 'Failed to suggest titles using Gemini AI.',
    });
  }
});

// Vite Integration for dev server / Express static for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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

startServer();
