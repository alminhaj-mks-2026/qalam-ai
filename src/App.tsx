import React, { useState, useEffect } from 'react';
import { Language, InputMode, BookGenre, AttachedFile, ChapterOutline, GeneratedBookData } from './types';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Workspace } from './components/Workspace';
import { BookTitleSection } from './components/BookTitleSection';
import { BookStructureSection } from './components/BookStructureSection';
import { BookPreview } from './components/BookPreview';
import { FinalActionArea } from './components/FinalActionArea';
import { PhaseInfoModal } from './components/PhaseInfoModal';
import { Footer } from './components/Footer';
import { generateBookWithGemini } from './services/aiService';
import { createBookPdfBlob, triggerPdfDownload, shareBookPdf } from './services/pdfService';

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

  const [chapters, setChapters] = useState<ChapterOutline[]>([
    {
      id: 'chap-1',
      title: 'باب ۱: فکری بنیادیں اور ابتدائی اصول',
      subheadings: ['علم کا تصور اور اہمیت', 'خام مواد کی جمع آوری', 'منطق و اسلوبِ بیان'],
    },
    {
      id: 'chap-2',
      title: 'باب ۲: ساخت و تدوین کا عمل',
      subheadings: ['ابواب کی تقسیمِ کار', 'ذیلی عنوانات اور ترتیب', 'روانی اور جامعیت'],
    },
    {
      id: 'chap-3',
      title: 'باب ۳: حتمی تنقیح اور اشاعت',
      subheadings: ['پریویو اور صفحہ بندی', 'پی ڈی ایف ڈیزائن', 'قاری کے لیے افادیت'],
    },
  ]);

  // Real Gemini AI Generation States
  const [isGeneratingBook, setIsGeneratingBook] = useState<boolean>(false);
  const [generationStatusText, setGenerationStatusText] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedBook, setGeneratedBook] = useState<GeneratedBookData | null>(null);

  // PDF Export & Share States
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);

  const [modalAction, setModalAction] = useState<'build' | 'pdf' | 'share' | null>(null);

  // Synchronize document direction and lang attributes when language changes
  useEffect(() => {
    const isRtl = language === 'ur' || language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  const handleScrollToWorkspace = () => {
    const workspaceEl = document.getElementById('workspace');
    if (workspaceEl) {
      workspaceEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Main handler for "کتاب تیار کریں"
   * Collects user rawText + attached file text contents, validates input, calls real Gemini API,
   * validates output, updates book state, and scrolls to live book view.
   */
  const handleGenerateBook = async () => {
    let combinedContent = rawText.trim();

    // Include text from attached files if present
    const attachedContent = attachedFiles
      .filter((f) => f.content && f.content.trim())
      .map((f) => `--- فائل: ${f.name} ---\n${f.content}`)
      .join('\n\n');

    if (attachedContent) {
      combinedContent = combinedContent ? `${combinedContent}\n\n${attachedContent}` : attachedContent;
    }

    // Input Validation
    if (!combinedContent) {
      setGenerationError('براہِ کرم پہلے اپنا تحریری مواد داخل کریں یا فائل اپ لوڈ کریں۔');
      const workspaceEl = document.getElementById('workspace');
      if (workspaceEl) workspaceEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsGeneratingBook(true);
    setGenerationError(null);
    setGenerationStatusText('Gemini AI مواد کا تجزیہ کر کے کتاب کے ابواب ترتیب دے رہا ہے...');

    try {
      const bookData = await generateBookWithGemini({
        content: combinedContent,
        title: title.trim() || undefined,
        authorName: authorName.trim() || undefined,
        genre,
        language,
      });

      // Update app state with real generated book data
      setGeneratedBook(bookData);

      if (bookData.title) setTitle(bookData.title);
      if (bookData.subtitle) setSubtitle(bookData.subtitle);
      if (bookData.authorName) setAuthorName(bookData.authorName);
      if (bookData.introduction) setPrefaceNote(bookData.introduction);
      if (bookData.conclusion) setConclusionNote(bookData.conclusion);
      if (bookData.chapters && bookData.chapters.length > 0) setChapters(bookData.chapters);

      setGenerationStatusText('کتاب کامیابی سے تیار ہو گئی ہے!');

      // Smooth scroll to book preview
      setTimeout(() => {
        const previewEl = document.getElementById('book-preview');
        if (previewEl) {
          previewEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 350);
    } catch (err: any) {
      console.error('Gemini Book Generation Error:', err);
      setGenerationError(err.message || 'کتاب کی تیاری کے دوران خرابی پیش آئی۔');
    } finally {
      setIsGeneratingBook(false);
    }
  };

  const handleExportPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

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

  const handleShareBook = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isExportingPdf || isSharingPdf) return;

    setIsSharingPdf(true);
    setPdfStatusMessage('پی ڈی ایف فائل اور شیئرنگ شیٹ تیار کی جا رہی ہے...');

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
    <div className={`min-h-screen bg-[#FBF9F5] text-slate-900 font-urdu selection:bg-[#D4AF37]/20`}>
      {/* 1. HEADER */}
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

      {/* 3. HOW IT WORKS */}
      <HowItWorks t={t} />

      {/* 4. BOOK CREATION WORKSPACE */}
      <Workspace
        t={t}
        inputMode={inputMode}
        setInputMode={setInputMode}
        rawText={rawText}
        setRawText={setRawText}
        authorName={authorName}
        setAuthorName={setAuthorName}
        genre={genre}
        setGenre={setGenre}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        onGenerateBook={handleGenerateBook}
        isGeneratingBook={isGeneratingBook}
        generationError={generationError}
        generationStatusText={generationStatusText}
      />

      {/* 5. BOOK TITLE SECTION */}
      <BookTitleSection
        t={t}
        title={title}
        setTitle={setTitle}
        subtitle={subtitle}
        setSubtitle={setSubtitle}
        genre={genre}
        rawText={rawText}
        language={language}
      />

      {/* 6. BOOK STRUCTURE SECTION */}
      <BookStructureSection
        t={t}
        chapters={chapters}
        setChapters={setChapters}
        prefaceNote={prefaceNote}
        setPrefaceNote={setPrefaceNote}
        conclusionNote={conclusionNote}
        setConclusionNote={setConclusionNote}
      />

      {/* 7. BOOK PREVIEW AREA */}
      <BookPreview
        t={t}
        title={title}
        subtitle={subtitle}
        authorName={authorName}
        genre={genre}
        rawText={rawText}
        prefaceNote={prefaceNote}
        conclusionNote={conclusionNote}
        chapters={chapters}
        onExportPdf={handleExportPdf}
        onShareBook={handleShareBook}
        isExportingPdf={isExportingPdf}
        isSharingPdf={isSharingPdf}
      />

      {/* 8. FINAL ACTION AREA */}
      <FinalActionArea
        t={t}
        onGenerateBook={handleGenerateBook}
        isGeneratingBook={isGeneratingBook}
        generationStatusText={generationStatusText}
        generationError={generationError}
        onExportPdf={handleExportPdf}
        onShareBook={handleShareBook}
        isExportingPdf={isExportingPdf}
        isSharingPdf={isSharingPdf}
        pdfStatusMessage={pdfStatusMessage}
      />

      {/* 9. FOOTER */}
      <Footer
        t={t}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* PHASE INFO MODAL */}
      <PhaseInfoModal
        t={t}
        actionType={modalAction}
        onClose={() => setModalAction(null)}
      />
    </div>
  );
}
