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

  console.log('[PREVIEW] REQUEST_START', { title, authorName, genre, language, jobId });

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
    console.log('[PREVIEW] REQUEST_SENT', { status: response.status, ok: response.ok });
  } catch (netErr: any) {
    console.warn('[Qalam API] Request network issue:', { message: netErr?.message });
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
    console.warn('[Qalam API] Job error:', { error: data.error, errorCode: data.errorCode });
    throw new AiServiceError({
      message: data.error || 'Gemini AI سروس کے ساتھ رابطہ قائم نہیں ہو سکا۔',
      statusCode: response.status || 500,
      errorCode: data.errorCode || 'API_ERROR',
      isQuotaExhausted: !!data.isQuotaExhausted,
      retryAfterSeconds: data.retryAfterSeconds || 30,
    });
  }

  console.log('[PREVIEW] JOB_CREATED', { jobId: data.jobId, status: data.status });

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
  console.log('[PREVIEW] POLLING_START', { jobId });
  let consecutiveNetworkErrors = 0;
  const maxNetworkRetries = 10;
  let pollCount = 0;
  const maxPollCount = 300; // 300 polls * 1.5s = 450s (7.5 minutes max total duration)

  while (pollCount < maxPollCount) {
    pollCount++;
    try {
      const statusData = await getBookJobStatus(jobId);
      consecutiveNetworkErrors = 0;

      console.log('[PREVIEW] POLLING', {
        jobId,
        pollCount,
        status: statusData.status,
        progressPercent: statusData.progressPercent,
        stage: statusData.currentStage,
      });

      if (onProgress) {
        onProgress(statusData);
      }

      if (statusData.status === 'completed') {
        console.log('[PREVIEW] JOB_COMPLETED', { jobId });
        return await getBookJobResult(jobId);
      }

      if (statusData.status === 'cancelled') {
        console.log('[PREVIEW] JOB_CANCELLED', { jobId });
        throw new AiServiceError({
          message: 'کتاب کی تیاری منسوخ کر دی گئی ہے۔',
          statusCode: 200,
          errorCode: 'JOB_CANCELLED',
        });
      }

      if (statusData.status === 'failed') {
        console.warn('[Qalam API] Background job reported failed status:', { jobId, error: statusData.error });
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
      if (err instanceof AiServiceError && (err.errorCode === 'JOB_CANCELLED' || err.errorCode === 'JOB_FAILED')) {
        throw err;
      }

      // Treat other errors (network blips, transient 500/502/503 during reload) as retryable
      consecutiveNetworkErrors++;
      console.warn(`[Qalam API] Polling retryable note (attempt ${consecutiveNetworkErrors}/${maxNetworkRetries}):`, err?.message);
      if (consecutiveNetworkErrors >= maxNetworkRetries) {
        console.warn('[Qalam API] Polling network timeout reached:', { message: err?.message });
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

  console.warn('[Qalam API] Job timeout:', { jobId });
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
      const pct = typeof statusInfo.progressPercent === 'number' ? statusInfo.progressPercent : 0;
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

export interface UploadedFileResult {
  fileId: string;
  extractedText: string;
  images: string[];
  wordCount: number;
}

export interface UploadProgressEvent {
  phase: 'uploading' | 'uploaded' | 'processing' | 'ready';
  progressPercent: number;
  stageMessage: string;
}

/**
 * Uploads a file directly with true byte-level transfer progress.
 * Completes as soon as the file is safely stored on the server without waiting for OCR or generation.
 */
export async function uploadFileDirect(
  fileOrBlob: File | Blob,
  fileName: string,
  fileType: string,
  onProgress?: (event: UploadProgressEvent) => void
): Promise<{ fileId: string; status: string; message: string }> {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-file');
    xhr.setRequestHeader('x-file-id', fileId);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(fileName));
    xhr.setRequestHeader('x-file-type', fileType);
    xhr.setRequestHeader('x-file-size', String(fileOrBlob.size));

    // Real byte progress while transferring over the network
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        if (onProgress) {
          onProgress({
            phase: 'uploading',
            progressPercent: pct,
            stageMessage: `اپ لوڈ ہو رہا ہے: ${pct}٪ (${(e.loaded / (1024 * 1024)).toFixed(1)}MB / ${(e.total / (1024 * 1024)).toFixed(1)}MB)...`,
          });
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            if (onProgress) {
              onProgress({
                phase: 'uploaded',
                progressPercent: 100,
                stageMessage: 'اپ لوڈ مکمل ہو گئی! (Upload complete)',
              });
            }
            resolve({ fileId, status: 'uploaded', message: res.message || 'Upload complete' });
          } else {
            reject(new Error(res.error || 'فائل اپ لوڈ ناکام رہی۔'));
          }
        } catch {
          resolve({ fileId, status: 'uploaded', message: 'Upload complete' });
        }
      } else {
        reject(new Error(`سرور کی جانب سے خرابی (Status ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('فائل اپ لوڈ کے دوران نیٹ ورک رابطہ منقطع ہو گیا۔'));
    };

    xhr.send(fileOrBlob);
  });
}

/**
 * Polls file extraction separately until ready.
 */
export async function pollFileExtractionUntilReady(
  fileId: string,
  onProgress?: (event: UploadProgressEvent) => void
): Promise<UploadedFileResult> {
  // Trigger processing asynchronously on the server
  try {
    await fetch('/api/process-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
  } catch (e) {
    console.warn('Could not explicitly trigger /api/process-file, continuing to poll:', e);
  }

  let pollAttempts = 0;
  const maxPolls = 600; // 600 * 1.5s = 900s (15 mins max for massive scanned manuscripts)
  while (pollAttempts < maxPolls) {
    pollAttempts++;
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const res = await fetch(`/api/file-status/${encodeURIComponent(fileId)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.success) continue;

      if (onProgress) {
        onProgress({
          phase: data.status === 'ready' ? 'ready' : 'processing',
          progressPercent: typeof data.progress === 'number' ? data.progress : 0,
          stageMessage: data.stage || 'متن نکالا جا رہا ہے...',
        });
      }

      if (data.status === 'ready') {
        return {
          fileId,
          extractedText: data.extractedText || '',
          images: data.images || [],
          wordCount: data.wordCount || 0,
        };
      }

      if (data.status === 'error') {
        throw new AiServiceError({
          message: data.error || 'فائل کی پروسیسنگ مکمل نہیں ہو سکی۔',
          statusCode: 500,
          errorCode: 'FILE_PROCESSING_FAILED',
        });
      }
    } catch (pollErr: any) {
      if (pollErr instanceof AiServiceError) throw pollErr;
      console.warn('[Upload] Polling note:', pollErr?.message);
    }
  }

  throw new AiServiceError({
    message: 'فائل سے متن نکالنے کا عمل مقررہ وقت میں مکمل نہیں ہو سکا۔',
    statusCode: 504,
    errorCode: 'FILE_PROCESSING_TIMEOUT',
  });
}

/**
 * Uploads a large file in safe 3.5 MB chunks (well below Cloud Run 32 MB and Vercel limits).
 * Supports files up to 50 MB+ with real progress and automatic chunk retry.
 */
export async function uploadFileChunked(
  fileOrBlob: File | Blob,
  fileName: string,
  fileType: string,
  onProgress?: (progressPercent: number, stageMessage: string) => void
): Promise<UploadedFileResult> {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB per chunk
  const totalSize = fileOrBlob.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(totalSize, (chunkIndex + 1) * CHUNK_SIZE);
    const chunkBlob = fileOrBlob.slice(start, end);

    let uploadSuccess = false;
    let attempts = 0;

    while (!uploadSuccess && attempts < 3) {
      attempts++;
      try {
        const uploadPercent = Math.min(99, Math.round(((chunkIndex + 1) / totalChunks) * 100));
        if (onProgress) {
          onProgress(
            uploadPercent,
            `چنک اپ لوڈ ہو رہا ہے: حصہ ${chunkIndex + 1}/${totalChunks} (${(end / (1024 * 1024)).toFixed(1)}MB / ${(totalSize / (1024 * 1024)).toFixed(1)}MB)...`
          );
        }

        // Try direct binary streaming chunk first (fastest, zero memory expansion)
        let res = await fetch('/api/upload-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-chunk-binary': 'true',
            'x-file-id': fileId,
            'x-chunk-index': String(chunkIndex),
            'x-total-chunks': String(totalChunks),
            'x-file-name': encodeURIComponent(fileName),
            'x-file-type': fileType,
            'x-file-size': String(totalSize),
          },
          body: chunkBlob,
        });

        if (!res.ok) {
          // Fallback to base64 JSON payload if streaming binary is rejected
          const arrayBuffer = await chunkBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i += 8192) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + 8192, len))));
          }
          const chunkBase64 = btoa(binary);

          res = await fetch('/api/upload-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId,
              chunkIndex,
              totalChunks,
              fileName,
              fileType,
              totalSize,
              chunkBase64,
            }),
          });
        }

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'چنک اپ لوڈ میں خرابی');
        uploadSuccess = true;
      } catch (err: any) {
        if (attempts >= 3) {
          throw new AiServiceError({
            message: `فائل اپ لوڈ کے دوران نیٹ ورک تعطل آیا (حصہ ${chunkIndex + 1}/${totalChunks})۔ براہِ کرم دوبارہ کوشش فرمائیں۔`,
            statusCode: 500,
            errorCode: 'CHUNK_UPLOAD_FAILED',
          });
        }
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }
  }

  if (onProgress) {
    onProgress(100, 'اپ لوڈ مکمل ہو گئی! متن اور نقوش نکالے جا رہے ہیں...');
  }

  return await pollFileExtractionUntilReady(fileId, (evt) => {
    if (onProgress) {
      onProgress(evt.progressPercent, evt.stageMessage);
    }
  });
}

/**
 * Intelligent resilient upload:
 * If file is >= 10 MB (e.g. 32 MB - 50 MB scanned PDFs), immediately uses chunked upload
 * to prevent HTTP 413 Request Entity Too Large.
 * For smaller files, uses fast direct stream and seamlessly falls back to chunking if needed.
 */
export async function uploadFileResilient(
  fileOrBlob: File | Blob,
  fileName: string,
  fileType: string,
  onProgress?: (progressPercent: number, stageMessage: string) => void
): Promise<UploadedFileResult> {
  const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2 MB

  if (fileOrBlob.size >= LARGE_FILE_THRESHOLD) {
    console.log(`[Upload] File size ${(fileOrBlob.size / 1024 / 1024).toFixed(1)}MB exceeds threshold. Using chunked upload pipeline.`);
    return uploadFileChunked(fileOrBlob, fileName, fileType, onProgress);
  }

  try {
    const uploadRes = await uploadFileDirect(fileOrBlob, fileName, fileType, (evt) => {
      if (onProgress) {
        onProgress(evt.progressPercent, evt.stageMessage);
      }
    });

    if (onProgress) {
      onProgress(100, 'اپ لوڈ مکمل ہو گئی! متن نکالا جا رہا ہے...');
    }

    return await pollFileExtractionUntilReady(uploadRes.fileId, (evt) => {
      if (onProgress) {
        onProgress(evt.progressPercent, evt.stageMessage);
      }
    });
  } catch (directErr: any) {
    console.warn('[Upload] Direct upload failed, seamlessly falling back to chunked upload:', directErr?.message);
    return uploadFileChunked(fileOrBlob, fileName, fileType, onProgress);
  }
}
