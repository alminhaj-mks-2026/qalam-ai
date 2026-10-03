import React, { useState } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { PreviewPage, ChapterOutline, BookGenre, CoverPageConfig, CoverLayout } from '../types';
import { QuotaErrorInfo } from './Workspace';
import { SupportedGeminiModel } from '../config/models';
import { renderScriptAwareReactParagraphs } from '../services/scriptTypography';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Feather,
  Book,
  Award,
  Sliders,
  X,
  Check,
  FileText,
  User,
  Sparkles,
  Palette,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Upload,
  AlertCircle,
  RefreshCw,
  Clock,
  Zap,
  FileDown,
  Share2,
  Loader2
} from 'lucide-react';

interface BookPreviewProps {
  t: TranslationDictionary;
  title: string;
  setTitle?: (title: string) => void;
  subtitle: string;
  setSubtitle?: (subtitle: string) => void;
  authorName: string;
  setAuthorName?: (authorName: string) => void;
  genre: BookGenre;
  rawText: string;
  prefaceNote: string;
  conclusionNote: string;
  chapters: ChapterOutline[];
  bodyFontSize?: number;
  setBodyFontSize?: (size: number) => void;
  pageSize?: 'A4' | 'A5' | 'Letter' | 'B5';
  setPageSize?: (size: 'A4' | 'A5' | 'Letter' | 'B5') => void;
  orientation?: 'portrait' | 'landscape';
  setOrientation?: (orientation: 'portrait' | 'landscape') => void;
  autoLayout?: boolean;
  setAutoLayout?: (auto: boolean) => void;
  coverConfig: CoverPageConfig;
  setCoverConfig: React.Dispatch<React.SetStateAction<CoverPageConfig>>;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  generationError?: string | null;
  quotaErrorInfo?: QuotaErrorInfo | null;
  isGeneratingBook?: boolean;
  onCancelGeneration?: () => void;
  onRetry?: (modelOverride?: SupportedGeminiModel) => void;
  onExportPdf?: () => void;
  onSharePdf?: () => void;
  isExportingPdf?: boolean;
  isSharingPdf?: boolean;
}

export const BookPreview: React.FC<BookPreviewProps> = ({
  t,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  authorName,
  setAuthorName,
  genre,
  rawText,
  prefaceNote,
  conclusionNote,
  chapters,
  bodyFontSize: externalBodyFontSize,
  setBodyFontSize: externalSetBodyFontSize,
  pageSize: externalPageSize,
  setPageSize: externalSetPageSize,
  orientation: externalOrientation,
  setOrientation: externalSetOrientation,
  autoLayout: externalAutoLayout,
  setAutoLayout: externalSetAutoLayout,
  coverConfig,
  setCoverConfig,
  isOpenModal = false,
  onCloseModal,
  generationError,
  quotaErrorInfo,
  isGeneratingBook,
  onCancelGeneration,
  onRetry,
  onExportPdf,
  onSharePdf,
  isExportingPdf,
  isSharingPdf,
}) => {
  const [currentPage, setCurrentPage] = useState<PreviewPage>('cover');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(isOpenModal);
  const [isTypographyOpen, setIsTypographyOpen] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'title' | 'cover' | 'layout'>('title');

  const removeRepeatedHeading = (contentStr: string, headingToCompare: string): string => {
    if (!contentStr || !headingToCompare) return contentStr;
    const cleanHeading = headingToCompare.replace(/^(باب\s*\d+\s*[:؛-]?\s*)/i, '').trim();
    if (!cleanHeading) return contentStr;

    try {
      const escapedHeading = cleanHeading.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(`^\\s*[*_#\\-\\[\\(]*\\s*${escapedHeading}\\s*[*_#\\-\\]\\)]*\\s*[:؛۔\\-\\n\\s]*`, 'u');
      return contentStr.replace(regex, '');
    } catch (e) {
      return contentStr;
    }
  };

  // Local state fallbacks if external setters aren't provided
  const [internalPageSize, setInternalPageSize] = useState<'A4' | 'A5' | 'Letter' | 'B5'>('A4');
  const [internalOrientation, setInternalOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [internalAutoLayout, setInternalAutoLayout] = useState<boolean>(true);
  const [internalFontSize, setInternalFontSize] = useState<number>(17);

  const pageSize = externalPageSize ?? internalPageSize;
  const setPageSize = externalSetPageSize ?? setInternalPageSize;

  const orientation = externalOrientation ?? internalOrientation;
  const setOrientation = externalSetOrientation ?? setInternalOrientation;

  const autoLayout = externalAutoLayout ?? internalAutoLayout;
  const setAutoLayout = externalSetAutoLayout ?? setInternalAutoLayout;

  const bodyFontSize = externalBodyFontSize ?? internalFontSize;
  const setBodyFontSize = externalSetBodyFontSize ?? setInternalFontSize;

  // Proportional typography calculations
  const effectiveFontSize = autoLayout
    ? (pageSize === 'A5' ? 14 : pageSize === 'B5' ? 15 : 16) + (orientation === 'landscape' ? 1 : 0)
    : bodyFontSize;

  const titleFontSize = Math.max(26, Math.round(effectiveFontSize * 1.85));
  const chapterHeadingFontSize = Math.max(20, Math.round(effectiveFontSize * 1.4));
  const sectionHeadingFontSize = Math.max(16, Math.round(effectiveFontSize * 1.25));
  const subheadingFontSize = Math.max(14, Math.round(effectiveFontSize * 1.1));

  // Dynamic page order based on chapters list
  const chapterPages = (chapters || []).map((_, idx) => `chapter_${idx + 1}`);
  const pageOrder: PreviewPage[] = ['cover', 'title_page', 'toc', ...chapterPages, 'conclusion'];

  // Ensure current page is valid when chapters change
  const currentIdx = pageOrder.indexOf(currentPage) !== -1 ? pageOrder.indexOf(currentPage) : 0;

  React.useEffect(() => {
    if (pageOrder.indexOf(currentPage) === -1) {
      setCurrentPage('cover');
    }
  }, [pageOrder.length, currentPage]);

  const handleNextPage = () => {
    if (currentIdx < pageOrder.length - 1) {
      setCurrentPage(pageOrder[currentIdx + 1]);
    }
  };

  const handlePrevPage = () => {
    if (currentIdx > 0) {
      setCurrentPage(pageOrder[currentIdx - 1]);
    }
  };

  const displayTitle = (title || '').trim() || 'کتاب کا عنوان';
  const displaySubtitle = (subtitle || '').trim() || 'ایک منظم اور مفصل مطالعہ';
  const displayAuthor = (authorName || '').trim() || 'عبد الحفیظ';

  // Container sizing helper based on Page Size & Orientation
  const getContainerSizeClasses = () => {
    if (orientation === 'landscape') {
      if (pageSize === 'A5') return 'w-full max-w-2xl min-h-[460px] sm:min-h-[520px]';
      if (pageSize === 'B5') return 'w-full max-w-3xl min-h-[500px] sm:min-h-[560px]';
      return 'w-full max-w-4xl min-h-[520px] sm:min-h-[600px]'; // A4 or Letter
    } else {
      if (pageSize === 'A5') return 'w-full max-w-md min-h-[480px] sm:min-h-[540px]';
      if (pageSize === 'B5') return 'w-full max-w-lg min-h-[500px] sm:min-h-[560px]';
      return 'w-full max-w-xl min-h-[500px] sm:min-h-[580px]'; // A4 or Letter
    }
  };

  const containerClass = `${getContainerSizeClasses()} bg-[#FAF8F5] text-slate-900 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between border-2 border-slate-800 book-shadow relative book-page-reflow transition-all duration-300`;

  // Helper to handle Logo Image Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverConfig((prev) => ({ ...prev, logoUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to render formatted book paragraphs with script-aware fonts and clean breaks
  const renderBookParagraphs = (contentStr: string, fontSize: number) => {
    return renderScriptAwareReactParagraphs(contentStr, fontSize);
  };

  const toUrduDigits = (num: number): string => {
    const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().split('').map((d) => urduDigits[parseInt(d, 10)] ?? d).join('');
  };

  const renderPageContent = () => {
    const showWatermark = coverConfig.showWatermark !== false;

    if (currentPage === 'cover') {
      const textAlignClass =
        coverConfig.alignment === 'right' ? 'text-right' : coverConfig.alignment === 'left' ? 'text-left' : 'text-center';

      return (
        <div
          style={{ backgroundColor: coverConfig.backgroundColor || '#0F172A' }}
          className={`${getContainerSizeClasses()} text-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden book-shadow transition-all duration-300`}
        >
          {/* Ornamental Double Inner Frame */}
          {coverConfig.showFrameBorder !== false && (
            <>
              <div
                style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}90` }}
                className="absolute inset-3 border-2 pointer-events-none rounded-xl"
              />
              <div
                style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}40` }}
                className="absolute inset-4 sm:inset-5 border pointer-events-none rounded-lg"
              />
            </>
          )}

          <div className="w-full h-full p-4 sm:p-8 flex flex-col justify-between relative z-10">
            <div className={`${textAlignClass} pt-4 space-y-4`}>
              {/* Logo Image or Icon */}
              {coverConfig.logoUrl ? (
                <div className="flex items-center justify-center mb-2">
                  <img
                    src={coverConfig.logoUrl}
                    alt="Book Logo"
                    className="max-h-16 max-w-[120px] object-contain rounded-lg border border-white/20 shadow-sm"
                  />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: `${coverConfig.themeColor || '#D4AF37'}20`,
                    borderColor: coverConfig.themeColor || '#D4AF37',
                    color: coverConfig.themeColor || '#D4AF37',
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full border flex items-center justify-center mb-3 shadow-sm"
                >
                  <Feather className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              )}

              {showWatermark && (
                <span
                  style={{ color: coverConfig.themeColor || '#D4AF37' }}
                  className="text-[10px] sm:text-xs uppercase font-brand tracking-widest block font-bold"
                >
                  {coverConfig.additionalText || 'Qalam AI Edition'}
                </span>
              )}

              <h1
                style={{ fontSize: `${titleFontSize}px` }}
                className="font-bold font-urdu text-white leading-relaxed px-2 sm:px-4 transition-all"
              >
                {displayTitle}
              </h1>

              <p
                style={{ color: `${coverConfig.themeColor || '#D4AF37'}DD` }}
                className="text-xs sm:text-base font-urdu leading-relaxed max-w-md mx-auto"
              >
                {displaySubtitle}
              </p>
            </div>

            {/* Center Ornament */}
            <div className="flex items-center justify-center my-4">
              <svg width="48" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.85 }}>
                <circle cx="32" cy="32" r="28" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1" strokeDasharray="3 3"/>
                <circle cx="32" cy="32" r="20" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1.2"/>
                <rect x="23.5" y="23.5" width="17" height="17" transform="rotate(45 32 32)" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1"/>
                <rect x="23.5" y="23.5" width="17" height="17" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1"/>
                <circle cx="32" cy="32" r="3.5" fill={coverConfig.themeColor || '#D4AF37'}/>
              </svg>
            </div>

            <div
              style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}40` }}
              className={`${textAlignClass} pb-2 space-y-1 relative border-t pt-4`}
            >
              <p
                style={{ color: coverConfig.themeColor || '#D4AF37' }}
                className="text-[11px] font-brand uppercase tracking-wider"
              >
                مصنّف
              </p>
              <h3 className="text-base sm:text-xl font-bold font-urdu text-white">{displayAuthor}</h3>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 'title_page') {
      return (
        <div className={containerClass}>
          <div className="w-full h-full border border-[#D4AF37]/80 rounded-xl p-4 sm:p-6 flex flex-col justify-between relative bg-white/70">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[11px] text-slate-500 font-urdu">
              <span className="text-[#D4AF37] font-bold">{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-700">{displayTitle}</span>
              <span>پیش لفظ</span>
            </div>

            {/* Main Content */}
            <div className="text-center pt-2 space-y-2 flex-1 overflow-y-auto">
              {showWatermark && (
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest block">
                  QALAM AI PUBLICATION
                </span>
              )}

              <h2
                style={{ fontSize: `${Math.max(20, Math.round(titleFontSize * 0.85))}px` }}
                className="font-bold font-urdu text-[#0F172A] leading-relaxed transition-all"
              >
                {displayTitle}
              </h2>

              <p className="text-xs sm:text-sm font-urdu text-slate-600">
                {displaySubtitle}
              </p>

              <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto my-3" />

              <div className="pt-0.5">
                <p className="text-xs font-urdu text-slate-500">مصنف:</p>
                <p className="text-sm sm:text-base font-bold font-urdu text-[#0F172A] mt-0.5">{displayAuthor}</p>
              </div>

              {prefaceNote && (
                <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl text-slate-800 leading-relaxed text-right rtl:text-right ltr:text-left shadow-2xs">
                  <strong style={{ fontSize: `${subheadingFontSize}px` }} className="block text-[#0F172A] font-bold mb-1.5">
                    دیباچہ و پیش لفظ:
                  </strong>
                  {renderBookParagraphs(prefaceNote, effectiveFontSize)}
                </div>
              )}
            </div>

            {/* Footer with Page Number */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[11px] text-slate-500 font-urdu">
              <span>{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-800 px-2.5 py-0.5 bg-slate-100 rounded border border-slate-300">
                صفحہ {toUrduDigits(1)}
              </span>
              <span>عنوان و پیش لفظ</span>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 'toc') {
      return (
        <div className={containerClass}>
          <div className="w-full h-full border border-[#D4AF37]/80 rounded-xl p-4 sm:p-6 flex flex-col justify-between relative bg-white/70">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[11px] text-slate-500 font-urdu">
              <span className="text-[#D4AF37] font-bold">{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-700">{displayTitle}</span>
              <span>فہرستِ مضامین</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="text-center border-b border-slate-300 pb-2.5 mb-4">
                <h3
                  style={{ fontSize: `${chapterHeadingFontSize}px` }}
                  className="font-bold font-urdu text-[#0F172A]"
                >
                  {t.previewTOC}
                </h3>
                <p className="text-xs font-urdu text-slate-500 mt-0.5">{displayTitle}</p>
              </div>

              <div className="space-y-2 font-urdu">
                <div 
                  onClick={() => setCurrentPage('title_page')}
                  className="flex items-center justify-between font-bold text-slate-800 py-1.5 cursor-pointer hover:text-[#D4AF37] active:scale-99 transition-all" 
                  style={{ fontSize: `${subheadingFontSize}px` }}
                >
                  <span className="text-right">دیباچہ و پیش لفظ</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                  <span className="font-bold text-slate-600 text-xs shrink-0">صفحہ {toUrduDigits(1)}</span>
                </div>

                {(chapters || []).map((chap, idx) => (
                  <div key={chap.id || idx} className="space-y-1">
                    <div 
                      onClick={() => setCurrentPage(`chapter_${idx + 1}`)}
                      className="flex items-center justify-between font-bold text-[#0F172A] py-1.5 cursor-pointer hover:text-[#D4AF37] active:scale-99 transition-all" 
                      style={{ fontSize: `${subheadingFontSize}px` }}
                    >
                      <span className="text-right">{chap.title}</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                      <span className="font-bold text-slate-600 text-xs shrink-0">صفحہ {toUrduDigits(idx + 2)}</span>
                    </div>

                    {chap.subheadings && chap.subheadings.length > 0 && (
                      <div className="pr-4 rtl:pr-4 text-slate-600 space-y-0.5" style={{ fontSize: `${Math.max(12, effectiveFontSize - 3)}px` }}>
                        {chap.subheadings.map((sub, sIdx) => (
                          <div key={sIdx} className="flex justify-between">
                            <span>• {sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div 
                  onClick={() => setCurrentPage('conclusion')}
                  className="flex items-center justify-between font-bold text-slate-800 py-1.5 pt-1 cursor-pointer hover:text-[#D4AF37] active:scale-99 transition-all" 
                  style={{ fontSize: `${subheadingFontSize}px` }}
                >
                  <span className="text-right">اختتامیہ و حاصلِ کلام</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                  <span className="font-bold text-slate-600 text-xs shrink-0">صفحہ {toUrduDigits((chapters || []).length + 2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[11px] text-slate-500 font-urdu">
              <span>{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-800 px-2.5 py-0.5 bg-slate-100 rounded border border-slate-300">
                صفحہ {toUrduDigits(2)}
              </span>
              <span>فہرستِ مضامین</span>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage.startsWith('chapter_')) {
      const chIdx = parseInt(currentPage.replace('chapter_', ''), 10) - 1;
      const currentChap = (chapters || [])[chIdx] || (chapters || [])[0];
      const pageNum = chIdx + 3;

      return (
        <div className={containerClass}>
          <div className="w-full h-full border border-[#D4AF37]/80 rounded-xl p-4 sm:p-6 flex flex-col justify-between relative bg-white/70">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[11px] text-slate-500 font-urdu">
              <span className="text-[#D4AF37] font-bold">{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-700">{displayTitle}</span>
              <span>باب {chIdx + 1}</span>
            </div>

            {/* Chapter Body */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="border-b border-slate-300 pb-2 text-center">
                <span className="text-xs font-bold font-urdu text-[#D4AF37] block mb-0.5">
                  باب {chIdx + 1}
                </span>
                <h3
                  style={{ fontSize: `${chapterHeadingFontSize}px` }}
                  className="font-bold font-urdu text-[#0F172A] leading-snug"
                >
                  {currentChap?.title || `باب ${chIdx + 1}`}
                </h3>
              </div>

              {currentChap?.summary && currentChap.summary.trim().length > 0 && (
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/90 font-urdu text-slate-800 italic shadow-2xs" style={{ fontSize: `${Math.max(12, effectiveFontSize - 2)}px` }}>
                  <strong className="text-amber-900 font-bold">خلاصہ: </strong> {currentChap.summary}
                </div>
              )}

              {/* Chapter Sections */}
              {currentChap?.sections && currentChap.sections.length > 0 ? (
                <div className="space-y-3 font-urdu text-slate-800 pr-1 overscroll-contain">
                  {currentChap.sections.map((sec, sIdx) => {
                    const cleanSecHeading = (sec?.heading || '').trim();
                    const cleanChapTitle = (currentChap?.title || '').trim();
                    const isRedundant = cleanSecHeading && (
                      cleanSecHeading === cleanChapTitle ||
                      cleanSecHeading.includes(cleanChapTitle) ||
                      cleanChapTitle.includes(cleanSecHeading)
                    );

                    let cleanContent = sec?.content || '';
                    if (sec?.heading) {
                      cleanContent = removeRepeatedHeading(cleanContent, sec.heading);
                    }
                    if (currentChap?.title) {
                      cleanContent = removeRepeatedHeading(cleanContent, currentChap.title);
                    }

                    return (
                      <div key={sIdx} className="space-y-1.5 border-b border-slate-200/80 pb-2.5 last:border-b-0">
                        {sec.heading && !isRedundant && (
                          <h4
                            style={{ fontSize: `${sectionHeadingFontSize}px` }}
                            className="font-bold text-[#0F172A] bg-slate-100/90 px-3 py-1.5 rounded-lg border-r-4 rtl:border-r-4 rtl:border-l-0 border-[#D4AF37]"
                          >
                            {sec.heading}
                          </h4>
                        )}
                        {renderBookParagraphs(cleanContent, effectiveFontSize)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="font-urdu leading-relaxed text-slate-800 space-y-3">
                  {rawText ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 shadow-2xs">
                      {renderBookParagraphs(rawText.slice(chIdx * 450, (chIdx + 1) * 450) || rawText.slice(0, 450), effectiveFontSize)}
                    </div>
                  ) : (
                    <p style={{ fontSize: `${effectiveFontSize}px` }} className="text-slate-600 font-urdu">
                      اس باب میں فراہم کردہ تحریر اور ذیلی عنوانات کی تفصیلی تحقیق اور نگارش پیش کی گئی ہے۔
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[11px] text-slate-500 font-urdu">
              <span>{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-800 px-2.5 py-0.5 bg-slate-100 rounded border border-slate-300">
                صفحہ {toUrduDigits(pageNum)}
              </span>
              <span>{displayTitle}</span>
            </div>
          </div>
        </div>
      );
    }

    if (currentPage === 'conclusion') {
      const pageNum = (chapters || []).length + 3;
      return (
        <div className={containerClass}>
          <div className="w-full h-full border border-[#D4AF37]/80 rounded-xl p-4 sm:p-6 flex flex-col justify-between relative bg-white/70">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[11px] text-slate-500 font-urdu">
              <span className="text-[#D4AF37] font-bold">{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-700">{displayTitle}</span>
              <span>اختتامیہ</span>
            </div>

            {/* Content */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="border-b border-slate-300 pb-2.5 text-center">
                <Award className="w-6 h-6 text-[#D4AF37] mx-auto mb-1" />
                <h3
                  style={{ fontSize: `${chapterHeadingFontSize}px` }}
                  className="font-bold font-urdu text-[#0F172A]"
                >
                  {t.previewConclusion}
                </h3>
                <p className="text-xs font-urdu text-slate-500">حاصلِ مطالعہ و سفارشات</p>
              </div>

              <div className="font-urdu leading-relaxed text-slate-800 space-y-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 shadow-2xs">
                  {renderBookParagraphs(
                    conclusionNote || 'اس کتاب کے تمام ابواب کا مطالعہ کرنے کے بعد یہ بات واضح ہو جاتی ہے کہ منظم انداز میں پیش کیا گیا مواد قاری کی سوچ میں حقیقی تبدیلی لاتا ہے۔',
                    effectiveFontSize
                  )}
                </div>

                <p className="text-slate-600 text-xs sm:text-sm text-center pt-1 font-urdu">
                  امید ہے کہ یہ تصنیف آپ کے لیے علمی اور عملی میدان میں مفید ثابت ہوگی۔
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[11px] text-slate-500 font-urdu">
              <span>{showWatermark ? 'Qalam AI' : ''}</span>
              <span className="font-bold text-slate-800 px-2.5 py-0.5 bg-slate-100 rounded border border-slate-300">
                صفحہ {toUrduDigits(pageNum)}
              </span>
              <span>اختتامیہ · ختم شد</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // The Toolbar containing Page Selector, Book Settings Popup button, Navigation, Zoom
  const renderToolbar = () => (
    <div className="flex items-center justify-between flex-wrap gap-2.5 bg-[#0F172A] text-slate-100 p-2.5 sm:p-3 rounded-xl border border-[#D4AF37]/30 text-xs font-urdu shadow-lg">
      
      {/* Page Step Buttons & Counter */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePrevPage}
          disabled={currentIdx === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors font-bold cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="hidden sm:inline">{t.prevPage}</span>
        </button>

        <span className="font-mono font-bold text-[#D4AF37] px-1.5 text-xs">
          {currentIdx + 1} / {pageOrder.length}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentIdx === pageOrder.length - 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors font-bold cursor-pointer"
        >
          <span className="hidden sm:inline">{t.nextPage}</span>
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Quick Section Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-xs p-0.5 bg-slate-800/80 rounded-lg border border-slate-700">
        <button
          onClick={() => setCurrentPage('cover')}
          className={`px-2 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer ${
            currentPage === 'cover' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          سرورق
        </button>
        <button
          onClick={() => setCurrentPage('toc')}
          className={`px-2 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer ${
            currentPage === 'toc' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          فہرست
        </button>
        {(chapters || []).map((ch, idx) => (
          <button
            key={ch.id || idx}
            onClick={() => setCurrentPage(`chapter_${idx + 1}`)}
            className={`px-2 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer ${
              currentPage === `chapter_${idx + 1}` ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            باب {idx + 1}
          </button>
        ))}
      </div>

      {/* Typography / Book Settings Popup Trigger Button & Modal */}
      <div className="flex items-center gap-2 relative">
        <div className="relative">
          <button
            onClick={() => setIsTypographyOpen(!isTypographyOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              isTypographyOpen
                ? 'bg-[#D4AF37] text-[#0F172A] border-[#D4AF37] font-bold shadow-md'
                : 'bg-slate-800 text-[#D4AF37] border-slate-700 hover:bg-slate-700'
            }`}
            title="کتاب کی ترتیبات و ٹائپوگرافی ایڈجسٹ کریں"
          >
            <Sliders className="w-4 h-4" />
            <span className="font-mono text-xs font-bold">{pageSize} · {orientation === 'landscape' ? 'افقی' : 'عمودی'} · {effectiveFontSize}px</span>
          </button>

          {/* Mobile & Desktop Fully Accessible Book Settings & Custom Cover Popup */}
          {isTypographyOpen && (
            <div className="fixed inset-x-2 bottom-2 top-14 sm:top-12 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:left-auto bg-[#0F172A] text-slate-100 border border-[#D4AF37]/60 rounded-2xl shadow-2xl w-auto sm:w-[420px] max-h-[85vh] flex flex-col text-right rtl:text-right ltr:text-left font-urdu overscroll-contain">
              
              {/* Sticky Popup Header */}
              <div className="shrink-0 flex items-center justify-between border-b border-slate-700/80 p-3.5 bg-[#0F172A] sticky top-0 z-10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-sm font-bold text-white">ترتیبات و ٹائپوگرافی (Book Settings)</span>
                </div>
                <button
                  onClick={() => setIsTypographyOpen(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  title="بند کریں"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Navigation in Popup */}
              <div className="shrink-0 flex items-center gap-1 p-1.5 bg-slate-900 border-b border-slate-800">
                <button
                  onClick={() => setActiveSettingsTab('title')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold font-urdu rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeSettingsTab === 'title' ? 'bg-[#D4AF37] text-[#0F172A]' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>عنوانات</span>
                </button>

                <button
                  onClick={() => setActiveSettingsTab('cover')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold font-urdu rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeSettingsTab === 'cover' ? 'bg-[#D4AF37] text-[#0F172A]' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>سرورق (Cover)</span>
                </button>

                <button
                  onClick={() => setActiveSettingsTab('layout')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold font-urdu rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeSettingsTab === 'layout' ? 'bg-[#D4AF37] text-[#0F172A]' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>صفحہ و فونٹس</span>
                </button>
              </div>

              {/* Scrollable Settings Body with Touch Scrolling */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-urdu scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                
                {/* TAB 1: TITLE & AUTHOR FIELDS */}
                {activeSettingsTab === 'title' && (
                  <div className="space-y-3">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-amber-200/90 mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Book Title / کتاب کا عنوان</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => {
                            if (setTitle) setTitle(e.target.value);
                            setCoverConfig((prev) => ({ ...prev, title: e.target.value }));
                          }}
                          placeholder="عنوان درج کریں"
                          className="w-full px-3 py-2 text-xs font-urdu bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          یہ عنوان تمام صفحات، سرورق اور ڈاؤن لوڈ شدہ پی ڈی ایف فائل پر فوراً منتقل ہو جائے گا۔
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-200/90 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>ذیلی عنوان (Subtitle)</span>
                        </label>
                        <input
                          type="text"
                          value={subtitle}
                          onChange={(e) => {
                            if (setSubtitle) setSubtitle(e.target.value);
                            setCoverConfig((prev) => ({ ...prev, subtitle: e.target.value }));
                          }}
                          placeholder="ذیلی عنوان"
                          className="w-full px-3 py-2 text-xs font-urdu bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-200/90 mb-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>مصنف کا نام (Author Name)</span>
                        </label>
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => {
                            if (setAuthorName) setAuthorName(e.target.value);
                            setCoverConfig((prev) => ({ ...prev, authorName: e.target.value }));
                          }}
                          placeholder="مصنف کا نام"
                          className="w-full px-3 py-2 text-xs font-urdu bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CUSTOM COVER PAGE CONTROLS */}
                {activeSettingsTab === 'cover' && (
                  <div className="space-y-3.5">
                    
                    {/* Cover Layout Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                        <span>سرورق کا طرزِ ڈیزائن (Layout Style):</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'royal_islamic', name: 'شاہی اسلامی (Royal)' },
                          { id: 'classic_gold', name: 'کلاسیک گولڈ (Gold)' },
                          { id: 'modern_minimal', name: 'ماڈرن منمل (Modern)' },
                          { id: 'academic_slate', name: 'علمی سلیٹ (Academic)' },
                          { id: 'minimal_dark', name: 'ڈارک تھیم (Dark)' },
                        ].map((ly) => (
                          <button
                            key={ly.id}
                            onClick={() =>
                              setCoverConfig((prev) => ({
                                ...prev,
                                layout: ly.id as CoverLayout,
                                backgroundColor:
                                  ly.id === 'royal_islamic'
                                    ? '#0F172A'
                                    : ly.id === 'classic_gold'
                                    ? '#2A080C'
                                    : ly.id === 'academic_slate'
                                    ? '#1E293B'
                                    : ly.id === 'minimal_dark'
                                    ? '#18181B'
                                    : '#FAF8F5',
                              }))
                            }
                            className={`p-2 text-[11px] font-bold font-urdu rounded-lg border transition-all text-center cursor-pointer ${
                              coverConfig.layout === ly.id
                                ? 'bg-[#D4AF37] text-[#0F172A] border-[#D4AF37] shadow-xs'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {ly.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200">
                        لکھائی کی سمت بندش (Text Alignment):
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setCoverConfig((prev) => ({ ...prev, alignment: 'right' }))}
                          className={`py-1.5 px-2 text-xs rounded-lg font-urdu flex items-center justify-center gap-1 cursor-pointer ${
                            coverConfig.alignment === 'right' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                          <span>راست</span>
                        </button>

                        <button
                          onClick={() => setCoverConfig((prev) => ({ ...prev, alignment: 'center' }))}
                          className={`py-1.5 px-2 text-xs rounded-lg font-urdu flex items-center justify-center gap-1 cursor-pointer ${
                            coverConfig.alignment === 'center' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>مرکز</span>
                        </button>

                        <button
                          onClick={() => setCoverConfig((prev) => ({ ...prev, alignment: 'left' }))}
                          className={`py-1.5 px-2 text-xs rounded-lg font-urdu flex items-center justify-center gap-1 cursor-pointer ${
                            coverConfig.alignment === 'left' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-300'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>چپ</span>
                        </button>
                      </div>
                    </div>

                    {/* Logo Image Upload / URL */}
                    <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-amber-200 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>لوگو یا تصویر (Optional Logo / Image)</span>
                      </label>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-3 py-1.5 bg-[#D4AF37] text-[#0F172A] font-bold rounded-lg cursor-pointer text-[11px] inline-flex items-center gap-1 shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>اپ لوڈ کریں</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>

                        {coverConfig.logoUrl && (
                          <button
                            onClick={() => setCoverConfig((prev) => ({ ...prev, logoUrl: '' }))}
                            className="px-2 py-1 bg-rose-600 text-white text-[10px] rounded hover:bg-rose-700"
                          >
                            لوگو ہٹائیں
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Theme & Background Colors */}
                    <div className="space-y-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          پسِ منظر رنگ (Background Color):
                        </label>
                        <div className="flex items-center gap-1.5">
                          {['#0F172A', '#1E1B4B', '#18181B', '#2A080C', '#022C22', '#FAF8F5'].map((col) => (
                            <button
                              key={col}
                              onClick={() => setCoverConfig((prev) => ({ ...prev, backgroundColor: col }))}
                              style={{ backgroundColor: col }}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                                coverConfig.backgroundColor === col ? 'border-[#D4AF37] scale-110' : 'border-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          عنواناتی رنگ (Theme Color):
                        </label>
                        <div className="flex items-center gap-1.5">
                          {['#D4AF37', '#F59E0B', '#38BDF8', '#34D399', '#E11D48', '#FFFFFF'].map((col) => (
                            <button
                              key={col}
                              onClick={() => setCoverConfig((prev) => ({ ...prev, themeColor: col }))}
                              style={{ backgroundColor: col }}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                                coverConfig.themeColor === col ? 'border-white scale-110' : 'border-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Frame Border Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-slate-200">سائڈ فریم باؤنڈری (Frame Border)</span>
                      <button
                        type="button"
                        onClick={() => setCoverConfig((prev) => ({ ...prev, showFrameBorder: !prev.showFrameBorder }))}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                          coverConfig.showFrameBorder ? 'bg-[#D4AF37]' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#0F172A] transition-transform ${
                            coverConfig.showFrameBorder ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-1 rtl:-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Qalam AI Watermark Toggle (Default: ON) */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="space-y-0.5 text-right rtl:text-right ltr:text-left">
                        <span className="text-xs font-bold text-slate-200">Qalam AI Watermark</span>
                        <span className="text-[10px] text-slate-400 block">
                          {coverConfig.showWatermark !== false ? 'واٹر مارک: فعال (Qalam AI)' : 'واٹر مارک: بند (مکمل ختم)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCoverConfig((prev) => ({ ...prev, showWatermark: prev.showWatermark === false ? true : false }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                          coverConfig.showWatermark !== false ? 'bg-[#D4AF37]' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-[#0F172A] transition-transform ${
                            coverConfig.showWatermark !== false ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                  </div>
                )}

                {/* TAB 3: PAGE SIZE, ORIENTATION & BODY FONT SIZE */}
                {activeSettingsTab === 'layout' && (
                  <div className="space-y-3.5">
                    
                    {/* Page Size */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>صفحہ کا سائز (Page Size):</span>
                        <span className="font-mono text-[11px] text-[#D4AF37] font-bold">{pageSize}</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                        {(['A4', 'A5', 'Letter', 'B5'] as const).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => {
                              setPageSize(sz);
                              if (autoLayout) {
                                if (sz === 'A5') setBodyFontSize(14);
                                else if (sz === 'B5') setBodyFontSize(15);
                                else setBodyFontSize(16);
                              }
                            }}
                            className={`py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
                              pageSize === sz
                                ? 'bg-[#D4AF37] text-[#0F172A] shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>صفحہ کا رخ (Orientation):</span>
                        <span className="font-urdu text-[11px] text-[#D4AF37] font-bold">
                          {orientation === 'landscape' ? 'افقی (Landscape)' : 'عمودی (Portrait)'}
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                        <button
                          onClick={() => {
                            setOrientation('portrait');
                            if (autoLayout) {
                              if (pageSize === 'A5') setBodyFontSize(14);
                              else setBodyFontSize(16);
                            }
                          }}
                          className={`py-2 px-3 text-xs font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            orientation === 'portrait'
                              ? 'bg-[#D4AF37] text-[#0F172A] shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span>📄 عمودی (Portrait)</span>
                        </button>
                        <button
                          onClick={() => {
                            setOrientation('landscape');
                            if (autoLayout) {
                              if (pageSize === 'A5') setBodyFontSize(15);
                              else setBodyFontSize(17);
                            }
                          }}
                          className={`py-2 px-3 text-xs font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            orientation === 'landscape'
                              ? 'bg-[#D4AF37] text-[#0F172A] shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span>📜 افقی (Landscape)</span>
                        </button>
                      </div>
                    </div>

                    {/* Body Font Size Slider + Presets */}
                    <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-urdu">
                        <span>متن کا فونِٹ سائز (Body Font Size):</span>
                        <span className="font-mono font-bold text-[#D4AF37] px-2 py-0.5 bg-slate-800 rounded border border-slate-700">{bodyFontSize}px</span>
                      </div>

                      <input
                        type="range"
                        min="14"
                        max="24"
                        step="1"
                        value={bodyFontSize}
                        onChange={(e) => {
                          setBodyFontSize(parseInt(e.target.value, 10));
                        }}
                        className="w-full accent-[#D4AF37] cursor-pointer"
                      />

                      <div className="grid grid-cols-6 gap-1 pt-1">
                        {[14, 16, 18, 20, 22, 24].map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setBodyFontSize(sz)}
                            className={`py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                              bodyFontSize === sz
                                ? 'bg-[#D4AF37] text-[#0F172A] font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto Layout Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
                      <div className="space-y-0.5 text-right rtl:text-right ltr:text-left">
                        <span className="text-xs font-bold text-amber-200 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>خودکار ڈیزائن (Auto Layout)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          سائز اور رخ کے مطابق سرخیوں کا بہترین تناسب
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const nextAuto = !autoLayout;
                          setAutoLayout(nextAuto);
                          if (nextAuto) {
                            if (pageSize === 'A5') setBodyFontSize(14);
                            else if (orientation === 'landscape') setBodyFontSize(17);
                            else setBodyFontSize(16);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                          autoLayout ? 'bg-[#D4AF37]' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-[#0F172A] transition-transform ${
                            autoLayout ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* Sticky Footer Apply / Save Action */}
              <div className="shrink-0 p-3 border-t border-slate-800/90 bg-[#0F172A] rounded-b-2xl sticky bottom-0 z-10">
                <button
                  onClick={() => setIsTypographyOpen(false)}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>ترتیبات لاگو کریں اور محفوظ کریں</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 border border-slate-700 rounded-lg">
          <button
            onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
            title={t.zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 text-amber-300">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
            title={t.zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fullscreen / Close Button */}
        {onCloseModal ? (
          <button
            onClick={onCloseModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">بند کریں</span>
          </button>
        ) : (
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-[#D4AF37] hover:bg-slate-700 font-bold rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFullScreen ? t.exitFullScreen : t.fullScreen}</span>
          </button>
        )}
      </div>
    </div>
  );

  // Full Screen Premium Publishing View Overlay
  if (isFullScreen || isOpenModal) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0B0F19] text-slate-100 flex flex-col justify-between overflow-hidden p-3 sm:p-6 font-urdu">
        
        {/* Full Screen Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <Book className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold font-urdu text-sm sm:text-base text-white block truncate">
                {displayTitle}
              </span>
              <span className="text-[11px] font-urdu text-amber-200/80 block">
                Full Screen Premium Book View (شائع شدہ کتاب کا معیار)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                disabled={isExportingPdf || isSharingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="پی ڈی ایف ڈاؤن لوڈ کریں"
              >
                {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">PDF حاصل کریں</span>
              </button>
            )}

            {onSharePdf && (
              <button
                onClick={onSharePdf}
                disabled={isExportingPdf || isSharingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] border border-[#D4AF37]/40 font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                title="پی ڈی ایف فائل شیئر کریں"
              >
                {isSharingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">PDF شیئر کریں</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsFullScreen(false);
                if (onCloseModal) onCloseModal();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold font-urdu transition-colors cursor-pointer shrink-0"
            >
              <Minimize2 className="w-4 h-4 text-[#D4AF37]" />
              <span className="hidden sm:inline">اسکرین بند کریں</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-3">
          {renderToolbar()}
        </div>

        {/* In-Preview Quota / Error Banner with Retry (Keeps Preview Open!) */}
        {generationError && (
          <div className="mb-3 p-3 sm:p-4 bg-amber-950/95 border border-[#D4AF37] rounded-xl text-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-urdu shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2.5 text-right rtl:text-right ltr:text-left overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div>
                <span className="font-bold text-[#D4AF37] block">
                  {quotaErrorInfo?.isQuotaExhausted ? '⚠️ Gemini کوٹہ کی حد (429 RESOURCE_EXHAUSTED)' : '⚠️ الرٹ'}
                </span>
                <span className="text-[11px] text-slate-200 block">
                  {generationError}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {quotaErrorInfo?.retryAfterSeconds && quotaErrorInfo.retryAfterSeconds > 0 ? (
                <span className="text-[11px] font-mono text-[#D4AF37] bg-slate-900 px-2 py-1 rounded border border-[#D4AF37]/30">
                  {quotaErrorInfo.retryAfterSeconds}s
                </span>
              ) : null}

              <button
                onClick={() => onRetry ? onRetry() : undefined}
                disabled={isGeneratingBook}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBook ? 'animate-spin' : ''}`} />
                <span>دوبارہ کوشش کریں (Retry)</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Spread Display Area */}
        <div className="flex-1 overflow-y-auto flex items-center justify-between py-2 px-1 relative">
          {/* Elegant Left Page Click Zone */}
          {currentIdx > 0 ? (
            <div 
              onClick={handlePrevPage}
              className="w-12 sm:w-20 shrink-0 self-stretch flex items-center justify-center cursor-pointer text-slate-400/30 hover:text-[#D4AF37] hover:bg-white/5 rounded-xl transition-all"
              title="پچھلا صفحہ"
            >
              <ChevronRight className="w-8 h-8 rotate-180" />
            </div>
          ) : (
            <div className="w-12 sm:w-20 shrink-0 self-stretch" />
          )}

          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            className="flex-1 flex justify-center transition-transform duration-200 z-10 mx-2"
          >
            {renderPageContent()}
          </div>

          {/* Elegant Right Page Click Zone */}
          {currentIdx < pageOrder.length - 1 ? (
            <div 
              onClick={handleNextPage}
              className="w-12 sm:w-20 shrink-0 self-stretch flex items-center justify-center cursor-pointer text-slate-400/30 hover:text-[#D4AF37] hover:bg-white/5 rounded-xl transition-all"
              title="اگلا صفحہ"
            >
              <ChevronLeft className="w-8 h-8 rotate-180" />
            </div>
          ) : (
            <div className="w-12 sm:w-20 shrink-0 self-stretch" />
          )}
        </div>

      </div>
    );
  }

  // Inline fallback container if rendered inline
  return (
    <section id="book-preview" className="py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {renderToolbar()}

        <div className="bg-[#EBE6DF] p-4 sm:p-8 rounded-2xl border border-slate-300 flex justify-between items-center overflow-auto relative">
          {/* Elegant Left Page Click Zone */}
          {currentIdx > 0 ? (
            <div 
              onClick={handlePrevPage}
              className="w-10 sm:w-14 shrink-0 self-stretch flex items-center justify-center cursor-pointer text-slate-600/30 hover:text-[#D4AF37] hover:bg-black/5 rounded-xl transition-all"
              title="پچھلا صفحہ"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </div>
          ) : (
            <div className="w-10 sm:w-14 shrink-0 self-stretch" />
          )}

          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="flex-1 flex justify-center transition-transform duration-200 z-10 mx-2"
          >
            {renderPageContent()}
          </div>

          {/* Elegant Right Page Click Zone */}
          {currentIdx < pageOrder.length - 1 ? (
            <div 
              onClick={handleNextPage}
              className="w-10 sm:w-14 shrink-0 self-stretch flex items-center justify-center cursor-pointer text-slate-600/30 hover:text-[#D4AF37] hover:bg-black/5 rounded-xl transition-all"
              title="اگلا صفحہ"
            >
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </div>
          ) : (
            <div className="w-10 sm:w-14 shrink-0 self-stretch" />
          )}
        </div>
      </div>
    </section>
  );
};
