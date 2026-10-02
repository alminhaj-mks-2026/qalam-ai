import React, { useState, useEffect, useRef } from 'react';
import { Language, InputMode, BookGenre, AttachedFile, ChapterOutline, GeneratedBookData, CoverPageConfig } from './types';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Workspace } from './components/Workspace';
import { BookPreview } from './components/BookPreview';
import { BookEditor } from './components/BookEditor';
import { Footer } from './components/Footer';
import {
  generateBookWithGemini,
  getBookJobStatus,
  getBookJobResult,
  pollBookJobUntilComplete,
  cancelBookJob,
  AiServiceError,
} from './services/aiService';
import { DEFAULT_GEMINI_MODEL, SupportedGeminiModel } from './config/models';
import { QuotaErrorInfo } from './components/Workspace';
import { createBookPdfBlob, triggerPdfDownload, shareBookPdf } from './services/pdfService';
import { cleanRawManuscript } from './services/manuscriptCleaner';
import { BookOpen, Edit3, FileDown, Share2, Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>('ur');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [rawText, setRawText] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('عبد الحفیظ');
  const [genre, setGenre] = useState<BookGenre>('academic');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  
  const [title, setTitle] = useState<string>('حکمتِ قلم اور جدید سائنس');
  const [subtitle, setSubtitle] = useState<string>('علم سے حقیقی مہارت تک کا سفر');
  const [prefaceNote, setPrefaceNote] = useState<string>('اس کتاب کا بنیادی مقصد خام خیالات اور تحریروں کو ایک مربوط، جاذب اور مفید کتاب میں ڈھالنا ہے۔');
  const [conclusionNote, setConclusionNote] = useState<string>('حاصلِ کلام یہ ہے کہ منظم نگارش اور تدوین سے ہی علم آئندہ نسلوں کے لیے محفوظ اور مؤثر بنتا ہے۔');

  const [bodyFontSize, setBodyFontSize] = useState<number>(16);
  const [pageSize, setPageSize] = useState<'A4' | 'A5' | 'Letter' | 'B5'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [autoLayout, setAutoLayout] = useState<boolean>(true);

  // Customizable Professional Cover Page State
  const [coverConfig, setCoverConfig] = useState<CoverPageConfig>({
    title: 'حکمتِ قلم اور جدید سائنس',
    subtitle: 'علم سے حقیقی مہارت تک کا سفر',
    authorName: 'عبد الحفیظ',
    additionalText: 'Qalam AI Edition',
    logoUrl: '',
    layout: 'royal_islamic',
    alignment: 'center',
    themeColor: '#D4AF37',
    backgroundColor: '#0F172A',
    showFrameBorder: true,
    showWatermark: true,
    isRtl: true,
  });

  // Keep Cover Page synced when title, subtitle, or authorName changes
  useEffect(() => {
    setCoverConfig((prev) => ({
      ...prev,
      title: title || prev.title,
      subtitle: subtitle || prev.subtitle,
      authorName: authorName || prev.authorName,
    }));
  }, [title, subtitle, authorName]);

  // Default initial book structure
  const [chapters, setChapters] = useState<ChapterOutline[]>([
    {
      id: 'chap-1',
      title: 'باب ۱: فکری بنیادیں اور ابتدائی اصول',
      summary: 'اس باب میں علم کی ساخت اور فکری اصولوں پر تفصیلی بحث کی گئی ہے۔',
      subheadings: ['علم کا تصور اور اہمیت', 'خام مواد کی جمع آوری', 'منطق و اسلوبِ بیان'],
      sections: [
        { heading: 'علم کا تصور اور اہمیت', content: 'علم و دانائی انسانی تاریخ کا عظیم ترین اثاثہ ہے۔ جب تک خام خیالات کو ایک منظم اور مربوط تحریر میں نہیں ڈھالا جاتا، اس وقت تک علم کا حقیقی نفع قاری تک نہیں پہنچتا۔' },
        { heading: 'خام مواد کی جمع آوری', content: 'تحریر نگاری کا پہلا مرحلہ تمام بنیادی حوالوں، نوٹوں اور ریکارڈنگز کو ایک جگہ جمع کرنا ہے۔' },
      ],
    },
    {
      id: 'chap-2',
      title: 'باب ۲: ساخت و تدوین کا عمل',
      summary: 'اس باب میں ابواب کی تقسیم اور تحریر کو کتاب کی شکل دینے کا انداز بیان ہوا ہے۔',
      subheadings: ['ابواب کی تقسیمِ کار', 'ذیلی عنوانات اور ترتیب', 'روانی اور جامعیت'],
      sections: [
        { heading: 'ابواب کی تقسیمِ کار', content: 'ہر کتاب کا ایک مرکزی خیال ہوتا ہے جس کے گرد تمام ابواب گردش کرتے ہیں۔' },
        { heading: 'ذیلی عنوانات اور ترتیب', content: 'ذیلی عنوانات قاری کو تحریر کی روانی اور فکری ربط سمجھنے میں مدد دیتے ہیں۔' },
      ],
    },
    {
      id: 'chap-3',
      title: 'باب ۳: حتمی تنقیح اور اشاعت',
      summary: 'پریویو، صفحہ بندی اور پی ڈی ایف فارمیٹنگ کے زریں اصول۔',
      subheadings: ['پریویو اور صفحہ بندی', 'پی ڈی ایف ڈیزائن', 'قاری کے لیے افادیت'],
      sections: [
        { heading: 'پریویو اور صفحہ بندی', content: 'صفحہ بندی میں خوبصورت فونٹس، حاشیے اور مناسب فاصلہ کتاب کی معنویت کو دوچند کرتا ہے۔' },
        { heading: 'قاری کے لیے افادیت', content: 'کتاب کا حقیقی مقصد قاری کی زندگی میں مثبت فکری یا عملی تبدیلی لانا ہے۔' },
      ],
    },
  ]);

  // Full Screen Book View Modal State
  const [isFullBookViewOpen, setIsFullBookViewOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Real Gemini AI Generation States
  const [isGeneratingBook, setIsGeneratingBook] = useState<boolean>(false);
  const isGeneratingRef = useRef<boolean>(false);
  const jobIdRef = useRef<string>('');
  const [generationStatusText, setGenerationStatusText] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [quotaErrorInfo, setQuotaErrorInfo] = useState<QuotaErrorInfo | null>(null);
  const [generatedBook, setGeneratedBook] = useState<GeneratedBookData | null>(null);

  // Countdown timer for 429 quota retry readiness
  useEffect(() => {
    if (!quotaErrorInfo || quotaErrorInfo.retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setQuotaErrorInfo((prev) => {
        if (!prev) return null;
        if (prev.retryAfterSeconds <= 1) {
          return { ...prev, retryAfterSeconds: 0 };
        }
        return { ...prev, retryAfterSeconds: prev.retryAfterSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quotaErrorInfo?.retryAfterSeconds]);

  // PDF Export & Share States
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);

  // Synchronize document direction and lang attributes when language changes
  useEffect(() => {
    const isRtl = language === 'ur' || language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Reset jobId when content changes so we generate a brand new book
  useEffect(() => {
    // Only reset if not currently generating
    if (!isGeneratingRef.current) {
      jobIdRef.current = '';
    }
  }, [rawText, attachedFiles]);

  // Background PDF Cache Warmer: Primes the PDF blob in memory as soon as book is ready
  // Guarantees zero network wait on Share button click, preserving transient user activation on FIRST CLICK!
  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const timer = setTimeout(() => {
        createBookPdfBlob({
          title,
          subtitle,
          authorName,
          genre,
          prefaceNote,
          conclusionNote,
          chapters,
          rawText,
          generatedBook,
          bodyFontSize,
          pageSize,
          orientation,
          autoLayout,
          coverConfig,
        }).catch((e) => console.warn('[PDF Cache Warmer] Background warming note:', e));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [title, subtitle, authorName, chapters, coverConfig, pageSize, orientation, bodyFontSize, isFullBookViewOpen]);

  /**
   * Seamlessly re-attaches to a running or completed background job
   * Enables persistent generation even if user reloads, switches tabs, or opens chat on mobile
   */
  const attachToExistingJob = async (jobId: string) => {
    if (isGeneratingRef.current) return;
    try {
      const statusInfo = await getBookJobStatus(jobId);
      if (!statusInfo) {
        try { localStorage.removeItem('qalam_active_job_id'); } catch (e) {}
        return;
      }

      if (statusInfo.status === 'completed') {
        const res = await getBookJobResult(jobId);
        const bookData = res.book;
        setGeneratedBook(bookData);
        if (bookData.title) setTitle(bookData.title);
        if (bookData.subtitle) setSubtitle(bookData.subtitle);
        if (bookData.authorName) setAuthorName(bookData.authorName);
        if (bookData.introduction) setPrefaceNote(bookData.introduction);
        if (bookData.conclusion) setConclusionNote(bookData.conclusion);
        if (bookData.chapters && bookData.chapters.length > 0) setChapters(bookData.chapters);

        setIsGeneratingBook(false);
        isGeneratingRef.current = false;
        setGenerationStatusText(null);
        setGenerationError(null);
        setQuotaErrorInfo(null);
        try {
          localStorage.removeItem('qalam_active_job_id');
        } catch (e) {}
        return;
      }

      if (statusInfo.status === 'cancelled' || statusInfo.status === 'failed') {
        setIsGeneratingBook(false);
        isGeneratingRef.current = false;
        setGenerationStatusText(null);
        try {
          localStorage.removeItem('qalam_active_job_id');
        } catch (e) {}
        if (statusInfo.status === 'failed' && statusInfo.error) {
          setGenerationError(statusInfo.error);
        }
        return;
      }

      if (statusInfo.status === 'in_progress' || statusInfo.status === 'planning' || statusInfo.status === 'pending') {
        setIsGeneratingBook(true);
        isGeneratingRef.current = true;
        jobIdRef.current = jobId;
        setGenerationError(null);
        setQuotaErrorInfo(null);
        setGenerationStatusText(`[${statusInfo.progressPercent}٪] ${statusInfo.message || 'کتاب تیار کی جا رہی ہے...'}`);

        try {
          const result = await pollBookJobUntilComplete(jobId, (s) => {
            setGenerationStatusText(`[${s.progressPercent}٪] ${s.message || 'کتاب تیار کی جا رہی ہے...'}`);
          });

          const bookData = result.book;
          setGeneratedBook(bookData);
          if (bookData.title) setTitle(bookData.title);
          if (bookData.subtitle) setSubtitle(bookData.subtitle);
          if (bookData.authorName) setAuthorName(bookData.authorName);
          if (bookData.introduction) setPrefaceNote(bookData.introduction);
          if (bookData.conclusion) setConclusionNote(bookData.conclusion);
          if (bookData.chapters && bookData.chapters.length > 0) setChapters(bookData.chapters);

          // Clear input/reset state upon successful completion
          setRawText('');
          setAttachedFiles([]);

          setIsGeneratingBook(false);
          isGeneratingRef.current = false;
          setGenerationStatusText(null);
          setGenerationError(null);
          setQuotaErrorInfo(null);
          try {
            localStorage.removeItem('qalam_active_job_id');
          } catch (e) {}
        } catch (pollErr: any) {
          if (pollErr?.errorCode === 'JOB_CANCELLED') {
            console.log('[attachToExistingJob] Job was cancelled.');
            setIsGeneratingBook(false);
            isGeneratingRef.current = false;
            setGenerationStatusText(null);
            setGenerationError(null);
            try { localStorage.removeItem('qalam_active_job_id'); } catch (e) {}
            return;
          }
          throw pollErr;
        }
      }
    } catch (err: any) {
      console.warn('Could not re-attach to existing job:', err);
      setIsGeneratingBook(false);
      isGeneratingRef.current = false;
      setGenerationStatusText(null);
      try {
        localStorage.removeItem('qalam_active_job_id');
      } catch (e) {}
    } finally {
      setIsGeneratingBook(false);
      isGeneratingRef.current = false;
    }
  };

  // Auto-resume active background job on component mount only if job was actively running
  useEffect(() => {
    try {
      const savedJobId = localStorage.getItem('qalam_active_job_id');
      if (savedJobId) {
        jobIdRef.current = savedJobId;
        attachToExistingJob(savedJobId);
      }
    } catch (e) {
      console.warn('LocalStorage access error on mount:', e);
    }
  }, []);

  // Listen to visibilitychange only (when returning to tab) without focus-event flapping
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const savedJobId = localStorage.getItem('qalam_active_job_id');
          // Only re-attach if not already actively polling or generating
          if (savedJobId && !isGeneratingRef.current) {
            attachToExistingJob(savedJobId);
          }
        } catch (e) {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const t = translations[language];

  const handleScrollToWorkspace = () => {
    const workspaceEl = document.getElementById('workspace');
    if (workspaceEl) {
      workspaceEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Main handler for "کتاب تیار کریں"
   * Strict single click = single generation flow guard to prevent duplicate requests.
   * Uses central primary model gemini-3.8-flash.
   */
  const handleGenerateBook = async (modelOverride?: SupportedGeminiModel) => {
    if (isGeneratingBook || isGeneratingRef.current) {
      console.warn('[handleGenerateBook] Generation already in progress. Ignoring duplicate click.');
      return; // Prevent duplicate requests
    }
    isGeneratingRef.current = true;
    setIsGeneratingBook(true);

    let combinedContent = rawText.trim();

    // Include text from attached files if present
    const attachedContent = attachedFiles
      .filter((f) => f.content && f.content.trim())
      .map((f) => `--- فائل: ${f.name} ---\n${f.content}`)
      .join('\n\n');

    if (attachedContent) {
      combinedContent = combinedContent ? `${combinedContent}\n\n${attachedContent}` : attachedContent;
    }

    // Clean manuscript automatically
    const cleaningResult = cleanRawManuscript(combinedContent);
    const cleanedText = cleaningResult.cleanedText;

    // Input Validation
    if (!cleanedText) {
      setGenerationError('براہِ کرم پہلے اپنا تحریری مواد داخل کریں، فائل اپ لوڈ کریں یا وائس نوٹ فراہم کریں۔');
      const workspaceEl = document.getElementById('workspace');
      if (workspaceEl) workspaceEl.scrollIntoView({ behavior: 'smooth' });
      isGeneratingRef.current = false;
      setIsGeneratingBook(false);
      return;
    }

    // Auto-detect author from WhatsApp headers if not manually changed
    if (cleaningResult.detectedAuthor && (!authorName || authorName === 'عبد الحفیظ')) {
      setAuthorName(cleaningResult.detectedAuthor);
    }

    const chosenModel = modelOverride || DEFAULT_GEMINI_MODEL;

    setGenerationError(null);
    setQuotaErrorInfo(null);
    setGenerationStatusText(`Gemini AI مواد کا تجزیہ کر کے پس منظر میں کتاب کے ابواب ترتیب دے رہا ہے...`);

    try {
      const result = await generateBookWithGemini({
        content: cleanedText,
        title: title.trim() || undefined,
        authorName: (cleaningResult.detectedAuthor && (!authorName || authorName === 'عبد الحفیظ'))
          ? cleaningResult.detectedAuthor
          : (authorName.trim() || undefined),
        genre,
        language,
        model: chosenModel,
        jobId: jobIdRef.current || undefined,
      }, (statusMessage) => {
        setGenerationStatusText(statusMessage);
      });

      if (result.jobId) {
        jobIdRef.current = result.jobId;
        try {
          localStorage.setItem('qalam_active_job_id', result.jobId);
        } catch (e) {}
      }

      const bookData = result.book;

      // Update app state with real generated book data
      setGeneratedBook(bookData);

      if (bookData.title) setTitle(bookData.title);
      if (bookData.subtitle) setSubtitle(bookData.subtitle);
      if (bookData.authorName) setAuthorName(bookData.authorName);
      if (bookData.introduction) setPrefaceNote(bookData.introduction);
      if (bookData.conclusion) setConclusionNote(bookData.conclusion);
      if (bookData.chapters && bookData.chapters.length > 0) setChapters(bookData.chapters);

      // Automatically clear input/reset state upon successful generation complete
      setRawText('');
      setAttachedFiles([]);

      setIsGeneratingBook(false);
      isGeneratingRef.current = false;
      setGenerationStatusText(null);
      setGenerationError(null);
      setQuotaErrorInfo(null);
      
      // Clear active job ID from localStorage upon success
      try {
        localStorage.removeItem('qalam_active_job_id');
      } catch (e) {}

      // Automatically launch Full Screen Premium Book View on success
      setIsFullBookViewOpen(true);
    } catch (err: any) {
      if (err?.errorCode === 'JOB_CANCELLED') {
        console.log('[handleGenerateBook] Generation was cancelled by user.');
        setIsGeneratingBook(false);
        isGeneratingRef.current = false;
        setGenerationStatusText(null);
        setGenerationError(null);
        setQuotaErrorInfo(null);
        try {
          localStorage.removeItem('qalam_active_job_id');
        } catch (e) {}
        return;
      }

      console.error('Gemini Book Generation Error:', err);
      const isQuota = !!err?.isQuotaExhausted || err?.statusCode === 429;
      
      // Clear localStorage active job to prevent flapping visibility/focus loop
      try {
        localStorage.removeItem('qalam_active_job_id');
      } catch (e) {}

      setQuotaErrorInfo({
        isQuotaExhausted: isQuota,
        message: err?.message || 'کتاب کی تیاری کے دوران خرابی پیش آئی۔',
        retryAfterSeconds: err?.retryAfterSeconds || 30,
        model: err?.model || chosenModel,
        isDailyLimit: err?.isDailyLimit,
      });

      setGenerationError(err.message || 'کتاب کی تیاری کے دوران خرابی پیش آئی۔');
      // CRITICAL: NEVER automatically open modal on error! Keep current view steady on workspace.
      setIsFullBookViewOpen(false);
    } finally {
      setIsGeneratingBook(false);
      isGeneratingRef.current = false;
    }
  };

  /**
   * Cancel Active Book Generation
   */
  const handleCancelGeneration = async () => {
    const currentJobId = jobIdRef.current;
    setIsGeneratingBook(false);
    isGeneratingRef.current = false;
    setGenerationStatusText(null);
    setGenerationError(null);
    setQuotaErrorInfo(null);
    try {
      localStorage.removeItem('qalam_active_job_id');
    } catch (e) {}

    if (currentJobId) {
      try {
        await cancelBookJob(currentJobId);
      } catch (e) {
        console.warn('Error calling cancelBookJob:', e);
      }
    }
  };

  const handleRetryGeneration = (modelOverride?: SupportedGeminiModel) => {
    if (isGeneratingBook || isGeneratingRef.current) return;
    handleGenerateBook(modelOverride);
  };

  /**
   * PDF Direct Download — Reuses cached PDF Blob instantly
   */
  const handleExportPdf = async () => {
    if (isExportingPdf || isSharingPdf) return;

    setIsExportingPdf(true);
    setPdfStatusMessage('پی ڈی ایف فائل تیار کی جا رہی ہے، براہِ کرم چند سیکنڈ انتظار فرمائیں...');

    try {
      const { blob, filename } = await createBookPdfBlob({
        title,
        subtitle,
        authorName,
        genre,
        prefaceNote,
        conclusionNote,
        chapters,
        rawText,
        generatedBook,
        bodyFontSize,
        pageSize,
        orientation,
        autoLayout,
        coverConfig,
      });

      triggerPdfDownload(blob, filename);
      setPdfStatusMessage('پی ڈی ایف فائل کامیابی سے ڈاؤن لوڈ ہو گئی ہے!');
      setTimeout(() => setPdfStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setPdfStatusMessage('پی ڈی ایف بنانے کے دوران خرابی پیش آئی۔ براہِ کرم دوبارہ کوشش کریں۔');
      setTimeout(() => setPdfStatusMessage(null), 6000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  /**
   * PDF File Share — Web Share API Level 2 (Shares actual PDF File to WhatsApp/Apps)
   * Reuses cached PDF Blob without regeneration.
   */
  const handleShareBook = async () => {
    if (isExportingPdf || isSharingPdf) return;

    setIsSharingPdf(true);
    setPdfStatusMessage('پی ڈی ایف فائل تیار کر کے شیئر کی جا رہی ہے...');

    try {
      const { blob, filename } = await createBookPdfBlob({
        title,
        subtitle,
        authorName,
        genre,
        prefaceNote,
        conclusionNote,
        chapters,
        rawText,
        generatedBook,
        bodyFontSize,
        pageSize,
        orientation,
        autoLayout,
        coverConfig,
      });

      const res = await shareBookPdf(blob, filename, title);
      if (res.message) {
        setPdfStatusMessage(res.message);
        setTimeout(() => setPdfStatusMessage(null), 7000);
      } else {
        setPdfStatusMessage(null);
      }
    } catch (err: any) {
      console.error('PDF Share Error:', err);
      setPdfStatusMessage('شیئرنگ کے دوران خرابی پیش آئی۔');
      setTimeout(() => setPdfStatusMessage(null), 5000);
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 font-urdu selection:bg-[#D4AF37]/20">
      {/* 1. HEADER (Single Language Selector) */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        t={t}
      />

      {/* 2. HERO */}
      <Hero
        t={t}
        onStartClick={handleScrollToWorkspace}
      />

      {/* 3. HOW IT WORKS (Clean 2x2 Grid) */}
      <HowItWorks t={t} />

      {/* 4. WORKSPACE & GENERATE BOOK */}
      <Workspace
        t={t}
        inputMode={inputMode}
        setInputMode={setInputMode}
        rawText={rawText}
        setRawText={setRawText}
        title={title}
        setTitle={setTitle}
        authorName={authorName}
        setAuthorName={setAuthorName}
        genre={genre}
        setGenre={setGenre}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        onGenerateBook={() => handleGenerateBook()}
        onCancelGeneration={handleCancelGeneration}
        isGeneratingBook={isGeneratingBook}
        generationError={generationError}
        generationStatusText={generationStatusText}
        quotaErrorInfo={quotaErrorInfo}
        onRetry={handleRetryGeneration}
      />

      {/* 5. CLEAN DASHBOARD ACTION CARD (PRIMARY BUTTON: 📖 تیار کتاب دیکھیں) */}
      <div id="book-section-anchor" className="py-8 px-4 sm:px-6 bg-[#FBF9F5]">
        <div className="max-w-4xl mx-auto bg-[#0F172A] text-slate-100 p-6 sm:p-8 rounded-2xl border border-[#D4AF37]/40 shadow-xl space-y-6 text-center">
          
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[#D4AF37] text-xs font-medium border border-[#D4AF37]/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>پبلشنگ ہاؤس ڈیجیٹل ڈیش بورڈ</span>
            </span>

            <h3 className="text-2xl sm:text-3xl font-bold font-urdu text-white tracking-tight">
              {title.trim() || 'آپ کی کتاب تیار ہے'}
            </h3>

            <p className="text-slate-300 text-xs sm:text-sm font-urdu max-w-lg mx-auto">
              کتاب کے صفحات، فہرست، سرورق اور فونٹس کا مکمل مطالعہ کرنے کے لیے نیچے دیے گئے بٹن پر کلک کریں۔
            </p>
          </div>

          {/* Prominent Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsFullBookViewOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold font-urdu text-base sm:text-lg rounded-xl shadow-lg transition-all transform active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-6 h-6" />
              <span>📖 تیار کتاب دیکھیں</span>
            </button>

            <button
              onClick={() => setIsEditorOpen(!isEditorOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold font-urdu text-sm sm:text-base rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-5 h-5 text-[#D4AF37]" />
              <span>{isEditorOpen ? 'ترمیم بند کریں' : '✏️ مسودہ میں ترمیم'}</span>
            </button>
          </div>

          {/* Export & Share Options */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || isSharingPdf}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs sm:text-sm font-bold font-urdu transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              ) : (
                <FileDown className="w-4 h-4 text-[#D4AF37]" />
              )}
              <span>⬇️ PDF حاصل کریں</span>
            </button>

            <button
              onClick={handleShareBook}
              disabled={isExportingPdf || isSharingPdf}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold font-urdu transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSharingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              ) : (
                <Share2 className="w-4 h-4 text-slate-300" />
              )}
              <span>↗️ PDF شیئر کریں</span>
            </button>
          </div>

          {/* PDF Status Notification */}
          {pdfStatusMessage && (
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-urdu text-center flex items-center justify-center gap-2">
              {(isExportingPdf || isSharingPdf) && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />}
              <span>{pdfStatusMessage}</span>
            </div>
          )}

        </div>
      </div>

      {/* FOCUSED MANUSCRIPT EDITOR (If toggled) */}
      {isEditorOpen && (
        <BookEditor
          t={t}
          title={title}
          setTitle={setTitle}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          authorName={authorName}
          setAuthorName={setAuthorName}
          prefaceNote={prefaceNote}
          setPrefaceNote={setPrefaceNote}
          conclusionNote={conclusionNote}
          setConclusionNote={setConclusionNote}
          chapters={chapters}
          setChapters={setChapters}
          onDoneEditing={() => {
            setIsEditorOpen(false);
            setIsFullBookViewOpen(true);
          }}
        />
      )}

      {/* FULL SCREEN PREMIUM BOOK VIEW MODAL */}
      {isFullBookViewOpen && (
        <BookPreview
          t={t}
          title={title}
          setTitle={setTitle}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          authorName={authorName}
          setAuthorName={setAuthorName}
          genre={genre}
          rawText={rawText}
          prefaceNote={prefaceNote}
          conclusionNote={conclusionNote}
          chapters={chapters}
          bodyFontSize={bodyFontSize}
          setBodyFontSize={setBodyFontSize}
          pageSize={pageSize}
          setPageSize={setPageSize}
          orientation={orientation}
          setOrientation={setOrientation}
          autoLayout={autoLayout}
          setAutoLayout={setAutoLayout}
          coverConfig={coverConfig}
          setCoverConfig={setCoverConfig}
          isOpenModal={true}
          onCloseModal={() => setIsFullBookViewOpen(false)}
          generationError={generationError}
          quotaErrorInfo={quotaErrorInfo}
          isGeneratingBook={isGeneratingBook}
          onCancelGeneration={handleCancelGeneration}
          onRetry={handleRetryGeneration}
          onExportPdf={handleExportPdf}
          onSharePdf={handleShareBook}
          isExportingPdf={isExportingPdf}
          isSharingPdf={isSharingPdf}
        />
      )}

      {/* 6. FOOTER (Clean, No language buttons) */}
      <Footer t={t} />
    </div>
  );
}
