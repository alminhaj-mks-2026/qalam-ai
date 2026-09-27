import { GeneratedBookData, BookGenre, Language } from '../types';

export class AiServiceError extends Error {
  statusCode: number;
  errorCode: string;
  isQuotaExhausted: boolean;
  retryAfterSeconds: number;
  model: string;
  isDailyLimit?: boolean;

  constructor(params: {
    message: string;
    statusCode?: number;
    errorCode?: string;
    isQuotaExhausted?: boolean;
    retryAfterSeconds?: number;
    model?: string;
    isDailyLimit?: boolean;
  }) {
    super(params.message);
    this.name = 'AiServiceError';
    this.statusCode = params.statusCode || 500;
    this.errorCode = params.errorCode || 'UNKNOWN_ERROR';
    this.isQuotaExhausted = !!params.isQuotaExhausted;
    this.retryAfterSeconds = params.retryAfterSeconds || 30;
    this.model = params.model || 'gemini-3.8-flash';
    this.isDailyLimit = params.isDailyLimit;
  }
}

export interface GenerateBookParams {
  content: string;
  title?: string;
  authorName?: string;
  genre?: BookGenre;
  language?: Language;
  model?: 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
}

export interface TitleSuggestion {
  title: string;
  subtitle: string;
}

/**
 * Sends actual user content to Gemini AI backend service to generate a structured book.
 * Validates the returned structure to ensure all required fields (title, chapters, sections, etc.) are valid.
 */
export async function generateBookWithGemini(params: GenerateBookParams): Promise<{
  book: GeneratedBookData;
  modelUsed: string;
}> {
  const { content, title, authorName, genre, language, model = 'gemini-3.8-flash' } = params;

  if (!content || !content.trim()) {
    throw new AiServiceError({
      message: 'کتاب تیار کرنے کے لیے تحریری مواد فراہم کرنا ضروری ہے۔',
      statusCode: 400,
      errorCode: 'MISSING_CONTENT',
      model,
    });
  }

  let response: Response;
  try {
    response = await fetch('/api/generate-book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content.trim(),
        title: title?.trim() || undefined,
        authorName: authorName?.trim() || undefined,
        genre: genre || 'general',
        language: language || 'ur',
        model,
      }),
    });
  } catch (netErr: any) {
    throw new AiServiceError({
      message: 'نیٹ ورک کنکشن میں رکاوٹ پیش آئی۔ برائے مہربانی انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
      statusCode: 0,
      errorCode: 'NETWORK_ERROR',
      model,
    });
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiServiceError({
      message: 'سرور کی جانب سے نامکمل جواب موصول ہوا۔ براہِ کرم دوبارہ کوشش کریں۔',
      statusCode: response.status || 500,
      errorCode: 'INVALID_RESPONSE',
      model,
    });
  }

  if (!response.ok || !data.success) {
    throw new AiServiceError({
      message: data.error || 'Gemini AI سروس کے ساتھ رابطہ قائم نہیں ہو سکا۔',
      statusCode: response.status || data.statusCode || 500,
      errorCode: data.errorCode || (response.status === 429 ? 'RESOURCE_EXHAUSTED' : 'API_ERROR'),
      isQuotaExhausted: data.isQuotaExhausted || response.status === 429,
      retryAfterSeconds: data.retryAfterSeconds || 30,
      model: data.model || model,
      isDailyLimit: data.isDailyLimit,
    });
  }

  const book: GeneratedBookData = data.book;

  // Frontend Response Validation
  if (!book || typeof book !== 'object') {
    throw new AiServiceError({
      message: 'Gemini AI کی جانب سے حاصل شدہ ڈیٹا درست فارمیٹ میں نہیں ہے۔',
      statusCode: 502,
      errorCode: 'INVALID_DATA',
      model,
    });
  }
  if (!book.title || typeof book.title !== 'string') {
    throw new AiServiceError({
      message: 'Gemini AI کی جانب سے کتاب کا عنوان تیار نہیں ہو سکا۔',
      statusCode: 502,
      errorCode: 'MISSING_TITLE',
      model,
    });
  }
  if (!Array.isArray(book.chapters) || book.chapters.length === 0) {
    throw new AiServiceError({
      message: 'Gemini AI کی جانب سے کتاب کے ابواب تشکیل نہیں پا سکے۔',
      statusCode: 502,
      errorCode: 'NO_CHAPTERS',
      model,
    });
  }

  // Validate each chapter
  book.chapters.forEach((chapter, index) => {
    if (!chapter.title || typeof chapter.title !== 'string') {
      chapter.title = `باب ${index + 1}`;
    }
    chapter.subheadings = Array.isArray(chapter.subheadings) ? chapter.subheadings : [];
    chapter.sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  });

  return {
    book,
    modelUsed: data.modelUsed || model,
  };
}

/**
 * Request title suggestions from Gemini AI based on user source content.
 */
export async function suggestTitlesWithGemini(params: {
  content: string;
  genre?: BookGenre;
  language?: Language;
  model?: 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
}): Promise<TitleSuggestion[]> {
  const { content, genre, language, model = 'gemini-3.8-flash' } = params;

  if (!content || !content.trim()) {
    throw new AiServiceError({
      message: 'عنوان کی تجاویز کے لیے پہلے کچھ تحریر درج کریں۔',
      statusCode: 400,
      errorCode: 'MISSING_CONTENT',
      model,
    });
  }

  let response: Response;
  try {
    response = await fetch('/api/suggest-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content.trim(),
        genre: genre || 'general',
        language: language || 'ur',
        model,
      }),
    });
  } catch (netErr: any) {
    throw new AiServiceError({
      message: 'نیٹ ورک رابطہ منقطع ہے۔ دوبارہ کوشش کریں۔',
      statusCode: 0,
      errorCode: 'NETWORK_ERROR',
      model,
    });
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiServiceError({
      message: 'سرور سے عنوانات کی تجاویز موصول نہیں ہو سکیں۔',
      statusCode: response.status || 500,
      errorCode: 'INVALID_RESPONSE',
      model,
    });
  }

  if (!response.ok || !data.success) {
    throw new AiServiceError({
      message: data.error || 'Gemini AI سے عنوانات تجاویز نہیں ہو سکے۔',
      statusCode: response.status || data.statusCode || 500,
      errorCode: data.errorCode || (response.status === 429 ? 'RESOURCE_EXHAUSTED' : 'API_ERROR'),
      isQuotaExhausted: data.isQuotaExhausted || response.status === 429,
      retryAfterSeconds: data.retryAfterSeconds || 30,
      model: data.model || model,
      isDailyLimit: data.isDailyLimit,
    });
  }

  if (!Array.isArray(data.suggestions)) {
    throw new AiServiceError({
      message: 'عنوانات کی تجاویز درست فارمیٹ میں موصول نہیں ہوئیں۔',
      statusCode: 502,
      errorCode: 'INVALID_DATA',
      model,
    });
  }

  return data.suggestions as TitleSuggestion[];
}
