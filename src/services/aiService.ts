import { GeneratedBookData, BookGenre, Language, BookJobStatusResponse } from '../types';
import { DEFAULT_GEMINI_MODEL, SECONDARY_GEMINI_MODEL, SupportedGeminiModel } from '../config/models';

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
    this.model = params.model || DEFAULT_GEMINI_MODEL;
    this.isDailyLimit = params.isDailyLimit;
  }
}

export interface GenerateBookParams {
  content: string;
  title?: string;
  authorName?: string;
  genre?: BookGenre;
  language?: Language;
  model?: SupportedGeminiModel;
  jobId?: string;
}

export interface TitleSuggestion {
  title: string;
  subtitle: string;
}

/**
 * Starts or resumes a background book generation job on the server.
 * Returns immediately with the unique Job ID.
 */
export async function startBookGenerationJob(params: GenerateBookParams): Promise<{
  jobId: string;
  status: string;
  message?: string;
  progressPercent?: number;
}> {
  const { content, title, authorName, genre, language, jobId } = params;

  if (!content || !content.trim()) {
    throw new AiServiceError({
      message: 'کتاب تیار کرنے کے لیے تحریری مواد فراہم کرنا ضروری ہے۔',
      statusCode: 400,
      errorCode: 'MISSING_CONTENT',
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
        jobId,
      }),
    });
  } catch (netErr: any) {
    throw new AiServiceError({
      message: 'نیٹ ورک کنکشن میں رکاوٹ پیش آئی۔ برائے مہربانی انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
      statusCode: 0,
      errorCode: 'NETWORK_ERROR',
    });
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiServiceError({
      message: 'سرور سے نامکمل جواب موصول ہوا۔ براہِ کرم دوبارہ کوشش کریں۔',
      statusCode: response.status || 500,
      errorCode: 'INVALID_RESPONSE',
    });
  }

  if (!response.ok || !data.success) {
    throw new AiServiceError({
      message: data.error || 'Gemini AI سروس کے ساتھ رابطہ قائم نہیں ہو سکا۔',
      statusCode: response.status || 500,
      errorCode: data.errorCode || 'API_ERROR',
      isQuotaExhausted: !!data.isQuotaExhausted,
      retryAfterSeconds: data.retryAfterSeconds || 30,
    });
  }

  return {
    jobId: data.jobId,
    status: data.status,
    message: data.message,
    progressPercent: data.progressPercent,
  };
}

/**
 * Polls the current real progress and status of a background book generation job.
 */
export async function getBookJobStatus(jobId: string): Promise<BookJobStatusResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/generate-book/status/${encodeURIComponent(jobId)}`);
  } catch (err: any) {
    throw new AiServiceError({
      message: 'سرور سے رابطہ عارضی طور پر منقطع ہوا۔ دوبارہ کوشش ہو رہی ہے...',
      statusCode: 0,
      errorCode: 'POLL_NETWORK_ERROR',
    });
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiServiceError({
      message: 'جاب کا اسٹیٹس جانچنے میں خرابی پیش آئی۔',
      statusCode: response.status || 500,
      errorCode: 'INVALID_STATUS_RESPONSE',
    });
  }

  if (!response.ok || !data.success) {
    throw new AiServiceError({
      message: data.error || 'جاب اسٹیٹس حاصل نہیں ہو سکا۔',
      statusCode: response.status || 500,
      errorCode: data.errorCode || 'STATUS_ERROR',
    });
  }

  return data as BookJobStatusResponse;
}

/**
 * Fetches the completed assembled book for a finished background job.
 */
export async function getBookJobResult(jobId: string): Promise<{
  book: GeneratedBookData;
  modelUsed: string;
}> {
  let response: Response;
  try {
    response = await fetch(`/api/generate-book/result/${encodeURIComponent(jobId)}`);
  } catch (err: any) {
    throw new AiServiceError({
      message: 'تیار کتاب کا مواد حاصل کرنے میں نیٹ ورک خرابی پیش آئی۔',
      statusCode: 0,
      errorCode: 'RESULT_NETWORK_ERROR',
    });
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new AiServiceError({
      message: 'سرور کی جانب سے کتاب کا ڈیٹا درست فارمیٹ میں موصول نہیں ہوا۔',
      statusCode: response.status || 500,
      errorCode: 'INVALID_RESULT_JSON',
    });
  }

  if (!response.ok || !data.success) {
    const qErr = data.quotaErrorInfo;
    throw new AiServiceError({
      message: data.error || 'کتاب کی تیاری مکمل نہیں ہو سکی۔',
      statusCode: response.status || 500,
      errorCode: qErr?.errorCode || 'JOB_FAILED',
      isQuotaExhausted: !!qErr?.isQuotaExhausted,
      retryAfterSeconds: qErr?.retryAfterSeconds || 30,
      model: data.modelUsed || qErr?.model,
      isDailyLimit: qErr?.isDailyLimit,
    });
  }

  const finalBook = data.book as GeneratedBookData;

  // Validate book structure
  if (!finalBook || typeof finalBook !== 'object' || !finalBook.title) {
    throw new AiServiceError({
      message: 'کتاب کا ڈیٹا نامکمل موصول ہوا۔',
      statusCode: 502,
      errorCode: 'INVALID_BOOK_DATA',
    });
  }

  if (!Array.isArray(finalBook.chapters) || finalBook.chapters.length === 0) {
    throw new AiServiceError({
      message: 'کتاب کے ابواب تشکیل نہیں پا سکے۔',
      statusCode: 502,
      errorCode: 'NO_CHAPTERS',
    });
  }

  finalBook.chapters.forEach((chapter, index) => {
    if (!chapter.title || typeof chapter.title !== 'string') {
      chapter.title = `باب ${index + 1}`;
    }
    chapter.subheadings = Array.isArray(chapter.subheadings) ? chapter.subheadings : [];
    chapter.sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  });

  return {
    book: finalBook,
    modelUsed: data.modelUsed || DEFAULT_GEMINI_MODEL,
  };
}

/**
 * Polls background job until completed, broadcasting real server progress events.
 * Highly resilient against brief network interruptions.
 */
export async function pollBookJobUntilComplete(
  jobId: string,
  onProgress?: (status: BookJobStatusResponse) => void
): Promise<{
  book: GeneratedBookData;
  modelUsed: string;
}> {
  let consecutiveNetworkErrors = 0;
  const maxNetworkRetries = 10;
  let pollCount = 0;
  const maxPollCount = 300; // 300 polls * 1.5s = 450s (7.5 minutes max total duration)

  while (pollCount < maxPollCount) {
    pollCount++;
    try {
      const statusData = await getBookJobStatus(jobId);
      consecutiveNetworkErrors = 0;

      if (onProgress) {
        onProgress(statusData);
      }

      if (statusData.status === 'completed') {
        return await getBookJobResult(jobId);
      }

      if (statusData.status === 'cancelled') {
        throw new AiServiceError({
          message: 'کتاب کی تیاری منسوخ کر دی گئی ہے۔',
          statusCode: 200,
          errorCode: 'JOB_CANCELLED',
        });
      }

      if (statusData.status === 'failed') {
        const qErr = statusData.quotaErrorInfo;
        throw new AiServiceError({
          message: statusData.error || 'کتاب کی تیاری کے دوران سرور پر خرابی پیش آئی۔',
          statusCode: qErr?.statusCode || 500,
          errorCode: qErr?.errorCode || 'JOB_FAILED',
          isQuotaExhausted: !!qErr?.isQuotaExhausted,
          retryAfterSeconds: qErr?.retryAfterSeconds || 30,
          model: statusData.modelUsed || qErr?.model,
          isDailyLimit: qErr?.isDailyLimit,
        });
      }
    } catch (err: any) {
      if (err instanceof AiServiceError && err.errorCode !== 'POLL_NETWORK_ERROR') {
        throw err;
      }

      consecutiveNetworkErrors++;
      if (consecutiveNetworkErrors >= maxNetworkRetries) {
        throw new AiServiceError({
          message: 'انٹرنیٹ رابطہ مستقل منقطع رہا۔ برائے مہربانی نیٹ ورک چیک کر کے دوبارہ کوشش فرمائیں۔',
          statusCode: 0,
          errorCode: 'NETWORK_TIMEOUT',
        });
      }
    }

    // Poll every 1.5 seconds
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new AiServiceError({
    message: 'کتاب کی تیاری مقررہ وقت (Timeout) میں مکمل نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش فرمائیں۔',
    statusCode: 504,
    errorCode: 'JOB_TIMEOUT',
  });
}

/**
 * Main Book Generation function:
 * Starts a production-grade background job, polls real server progress, and returns assembled book.
 */
export async function generateBookWithGemini(
  params: GenerateBookParams,
  onProgress?: (statusText: string) => void
): Promise<{
  book: GeneratedBookData;
  modelUsed: string;
  jobId: string;
}> {
  const { jobId, status, message } = await startBookGenerationJob(params);

  if (onProgress && message) {
    onProgress(`[۵٪] ${message}`);
  }

  const result = await pollBookJobUntilComplete(jobId, (statusInfo) => {
    if (onProgress) {
      const pct = statusInfo.progressPercent || 10;
      onProgress(`[${pct}٪] ${statusInfo.message || 'کتاب تیار کی جا رہی ہے...'}`);
    }
  });

  return {
    ...result,
    jobId,
  };
}

/**
 * Request title suggestions from Gemini AI based on user source content.
 */
export async function suggestTitlesWithGemini(params: {
  content: string;
  genre?: BookGenre;
  language?: Language;
  model?: SupportedGeminiModel;
}): Promise<TitleSuggestion[]> {
  const { content, genre, language, model = DEFAULT_GEMINI_MODEL } = params;

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

/**
 * Cancels an active or pending background book generation job.
 */
export async function cancelBookJob(jobId: string): Promise<{ success: boolean; status: string; message?: string }> {
  try {
    const response = await fetch(`/api/generate-book/cancel/${encodeURIComponent(jobId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('Network error while cancelling book generation job:', err);
    return { success: true, status: 'cancelled' };
  }
}
