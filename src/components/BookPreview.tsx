import React, { useState } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { PreviewPage, ChapterOutline, BookGenre } from '../types';
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
  FileText,
  List,
  Award,
  FileDown,
  Share2,
  Loader2
} from 'lucide-react';

interface BookPreviewProps {
  t: TranslationDictionary;
  title: string;
  subtitle: string;
  authorName: string;
  genre: BookGenre;
  rawText: string;
  prefaceNote: string;
  conclusionNote: string;
  chapters: ChapterOutline[];
  onExportPdf?: (e?: React.MouseEvent) => void;
  onShareBook?: (e?: React.MouseEvent) => void;
  isExportingPdf?: boolean;
  isSharingPdf?: boolean;
}

export const BookPreview: React.FC<BookPreviewProps> = ({
  t,
  title,
  subtitle,
  authorName,
  genre,
  rawText,
  prefaceNote,
  conclusionNote,
  chapters,
  onExportPdf,
  onShareBook,
  isExportingPdf = false,
  isSharingPdf = false,
}) => {
  const [currentPage, setCurrentPage] = useState<PreviewPage>('cover');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Dynamic page list based on actual chapters generated
  const chapterPages = chapters.map((_, idx) => `chapter_${idx + 1}`);
  const pageOrder: PreviewPage[] = ['cover', 'title_page', 'toc', ...chapterPages, 'conclusion'];

  // Ensure current page is valid when chapters change
  const currentIdx = pageOrder.indexOf(currentPage) !== -1 ? pageOrder.indexOf(currentPage) : 0;

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

  const displayTitle = title.trim() || 'کتاب کا عنوان';
  const displaySubtitle = subtitle.trim() || 'ایک منظم اور مفصل مطالعہ';
  const displayAuthor = authorName.trim() || 'عبد الحفیظ';

  const renderPageContent = () => {
    if (currentPage === 'cover') {
      return (
        <div className="w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#0F172A] text-slate-100 rounded-lg p-8 sm:p-12 flex flex-col justify-between border-4 border-[#D4AF37]/50 relative overflow-hidden book-shadow">
          {/* Elegant Ornamental Borders */}
          <div className="absolute inset-3 border border-[#D4AF37]/30 pointer-events-none" />
          <div className="absolute top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

          <div className="text-center pt-8 space-y-3 relative z-10">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center mb-4">
              <Feather className="w-6 h-6" />
            </div>

            <span className="text-xs uppercase font-brand tracking-widest text-[#D4AF37] block">
              AL-MINHAJ MKS / Qalam AI Edition
            </span>

            <h1 className="text-2xl sm:text-4xl font-bold font-urdu text-white leading-relaxed px-4">
              {displayTitle}
            </h1>

            <p className="text-sm sm:text-base font-urdu text-amber-200/90 leading-relaxed max-w-md mx-auto">
              {displaySubtitle}
            </p>
          </div>

          <div className="text-center pb-6 space-y-2 relative z-10 border-t border-[#D4AF37]/20 pt-6">
            <p className="text-xs text-[#D4AF37] font-brand uppercase tracking-wider">مصنّف</p>
            <h3 className="text-lg font-bold font-urdu text-white">{displayAuthor}</h3>
          </div>
        </div>
      );
    }

    if (currentPage === 'title_page') {
      return (
        <div className="w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#FBF9F5] text-slate-900 rounded-lg p-8 sm:p-12 flex flex-col justify-between border border-slate-300 book-shadow relative">
          <div className="text-center pt-10 space-y-4">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-widest block">
              AL-MINHAJ MKS PUBLICATION
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold font-urdu text-[#0F172A] leading-relaxed">
              {displayTitle}
            </h2>

            <p className="text-sm font-urdu text-slate-600">
              {displaySubtitle}
            </p>

            <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto my-6" />

            <div className="pt-2">
              <p className="text-xs font-urdu text-slate-500">مصنف:</p>
              <p className="text-base font-bold font-urdu text-[#0F172A] mt-1">{displayAuthor}</p>
            </div>

            {prefaceNote && (
              <div className="mt-6 p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs font-urdu text-slate-700 leading-relaxed text-right rtl:text-right ltr:text-left">
                <strong className="block text-[#0F172A] font-bold mb-1">دیباچہ و پیش لفظ:</strong>
                {prefaceNote}
              </div>
            )}
          </div>

          <div className="text-center text-[11px] font-urdu text-slate-400 border-t border-slate-200 pt-4">
            <span>صفحہ ۱ · عنوان و پیش لفظ</span>
          </div>
        </div>
      );
    }

    if (currentPage === 'toc') {
      return (
        <div className="w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#FBF9F5] text-slate-900 rounded-lg p-6 sm:p-10 flex flex-col justify-between border border-slate-300 book-shadow">
          <div>
            <div className="text-center border-b border-slate-300 pb-4 mb-6">
              <h3 className="text-xl font-bold font-urdu text-[#0F172A]">{t.previewTOC}</h3>
              <p className="text-xs font-urdu text-slate-500 mt-1">{displayTitle}</p>
            </div>

            <div className="space-y-3 font-urdu">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-dotted border-slate-300 pb-1.5">
                <span>دیباچہ و پیش لفظ</span>
                <span className="font-mono text-slate-500">صفحہ ۱</span>
              </div>

              {chapters.map((chap, idx) => (
                <div key={chap.id || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] border-b border-dotted border-slate-300 pb-1">
                    <span>{chap.title}</span>
                    <span className="font-mono text-slate-500">صفحہ {5 + idx * 6}</span>
                  </div>

                  <div className="pr-4 rtl:pr-4 text-[11px] text-slate-600 space-y-0.5">
                    {chap.subheadings?.map((sub, sIdx) => (
                      <div key={sIdx} className="flex justify-between">
                        <span>• {sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-dotted border-slate-300 pb-1.5 pt-2">
                <span>اختتامیہ و حاصلِ کلام</span>
                <span className="font-mono text-slate-500">صفحہ {5 + chapters.length * 6 + 4}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] font-urdu text-slate-400 border-t border-slate-200 pt-4">
            <span>فہرستِ مضامین</span>
          </div>
        </div>
      );
    }

    if (currentPage.startsWith('chapter_')) {
      const chIdx = parseInt(currentPage.replace('chapter_', ''), 10) - 1;
      const currentChap = chapters[chIdx] || chapters[0];

      return (
        <div className="w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#FBF9F5] text-slate-900 rounded-lg p-6 sm:p-10 flex flex-col justify-between border border-slate-300 book-shadow">
          <div className="space-y-4">
            <div className="border-b border-slate-300 pb-3">
              <span className="text-[11px] font-bold font-urdu text-[#D4AF37] block">
                باب {chIdx + 1}
              </span>
              <h3 className="text-lg sm:text-xl font-bold font-urdu text-[#0F172A]">
                {currentChap?.title || `باب ${chIdx + 1}`}
              </h3>
            </div>

            {currentChap?.summary && (
              <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs font-urdu text-slate-700 italic">
                <strong>خلاصہ: </strong> {currentChap.summary}
              </div>
            )}

            {/* Render full chapter sections if present */}
            {currentChap?.sections && currentChap.sections.length > 0 ? (
              <div className="space-y-4 font-urdu text-xs sm:text-sm leading-relaxed text-slate-800 max-h-[380px] overflow-y-auto pr-1">
                {currentChap.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-1.5 border-b border-slate-200/80 pb-3 last:border-b-0">
                    <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] bg-slate-100/80 px-2.5 py-1 rounded border-r-2 rtl:border-r-2 rtl:border-l-0 border-[#D4AF37]">
                      {sec.heading}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-urdu whitespace-pre-line px-1">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback if sections list is empty */
              <div className="text-xs sm:text-sm font-urdu leading-relaxed text-slate-800 space-y-3">
                {prefaceNote && chIdx === 0 && (
                  <p className="first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:ml-2 text-slate-800">
                    {prefaceNote}
                  </p>
                )}

                {rawText ? (
                  <p className="bg-white p-3 rounded border border-slate-200 text-slate-700 leading-relaxed">
                    {rawText.slice(chIdx * 400, (chIdx + 1) * 400) || rawText.slice(0, 400)}
                  </p>
                ) : (
                  <p className="text-slate-600">
                    اس باب میں فراہم کردہ تحریر اور ذیلی عنوانات کی تفصیلی تحقیق اور نگارش پیش کی گئی ہے۔
                  </p>
                )}

                {currentChap?.subheadings?.length > 0 && (
                  <div className="pt-2 space-y-2">
                    {currentChap.subheadings.map((sub, sIdx) => (
                      <div key={sIdx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <h5 className="text-xs font-bold text-[#0F172A] mb-0.5">• {sub}</h5>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center text-[11px] font-urdu text-slate-400 border-t border-slate-200 pt-4">
            <span>صفحہ {5 + chIdx * 6}</span>
          </div>
        </div>
      );
    }

    if (currentPage === 'conclusion') {
      return (
        <div className="w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#FBF9F5] text-slate-900 rounded-lg p-6 sm:p-10 flex flex-col justify-between border border-slate-300 book-shadow">
          <div className="space-y-4">
            <div className="border-b border-slate-300 pb-3 text-center">
              <Award className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
              <h3 className="text-xl font-bold font-urdu text-[#0F172A]">{t.previewConclusion}</h3>
              <p className="text-xs font-urdu text-slate-500">حاصلِ مطالعہ و سفارشات</p>
            </div>

            <div className="text-xs sm:text-sm font-urdu leading-relaxed text-slate-800 space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed shadow-xs">
                {conclusionNote ? conclusionNote : 'اس کتاب کے تمام ابواب کا مطالعہ کرنے کے بعد یہ بات واضح ہو جاتی ہے کہ منظم انداز میں پیش کیا گیا مواد قاری کی سوچ میں حقیقی تبدیلی لاتا ہے۔'}
              </div>

              <p className="text-slate-600 text-xs text-center pt-2">
                امید ہے کہ یہ تصنیف آپ کے لیے علمی اور عملی میدان میں مفید ثابت ہوگی۔
              </p>
            </div>
          </div>

          <div className="text-center text-[11px] font-urdu text-slate-400 border-t border-slate-200 pt-4">
            <span>اختتامیہ · ختم شد</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <section id="book-preview" className="py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-[#D4AF37] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-urdu text-[#0F172A]">
                {t.previewHeading}
              </h2>
              <p className="text-xs font-urdu text-slate-600 mt-0.5">
                {t.previewSubtitle}
              </p>
            </div>
          </div>

          {/* View Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto text-xs font-urdu font-medium max-w-full">
            <button
              onClick={() => setCurrentPage('cover')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'cover' ? 'bg-[#0F172A] text-[#D4AF37]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.previewCover}
            </button>

            <button
              onClick={() => setCurrentPage('title_page')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'title_page' ? 'bg-[#0F172A] text-[#D4AF37]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.previewTitlePage}
            </button>

            <button
              onClick={() => setCurrentPage('toc')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'toc' ? 'bg-[#0F172A] text-[#D4AF37]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.previewTOC}
            </button>

            {chapters.map((ch, idx) => (
              <button
                key={ch.id || idx}
                onClick={() => setCurrentPage(`chapter_${idx + 1}`)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  currentPage === `chapter_${idx + 1}` ? 'bg-[#0F172A] text-[#D4AF37]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                باب {idx + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage('conclusion')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'conclusion' ? 'bg-[#0F172A] text-[#D4AF37]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.previewConclusion}
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs font-urdu">
          {/* Page Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentIdx === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors font-bold cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              <span>{t.prevPage}</span>
            </button>

            <span className="font-mono font-bold text-slate-700 px-2">
              {currentIdx + 1} / {pageOrder.length}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentIdx === pageOrder.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors font-bold cursor-pointer"
            >
              <span>{t.nextPage}</span>
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Zoom, PDF Export & Full Screen Controls */}
          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onExportPdf(e);
                }}
                disabled={isExportingPdf || isSharingPdf}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-300 font-bold rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
                title="پی ڈی ایف فائل ڈاؤن لوڈ کریں"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span className="hidden sm:inline">پی ڈی ایف</span>
              </button>
            )}

            {onShareBook && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShareBook(e);
                }}
                disabled={isExportingPdf || isSharingPdf}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
                title="پی ڈی ایف فائل شیئر کریں"
              >
                {isSharingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span className="hidden sm:inline">شیئر</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-white p-1 border border-slate-300 rounded-lg">
              <button
                onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
                className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                title={t.zoomOut}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1 text-slate-700">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                title={t.zoomIn}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setIsFullScreen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] text-[#D4AF37] hover:bg-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.fullScreen}</span>
            </button>
          </div>
        </div>

        {/* Live Book Container Canvas */}
        <div className="bg-[#EBE6DF] p-4 sm:p-8 rounded-2xl border border-slate-300 flex justify-center items-center overflow-auto">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-lg transition-transform duration-200"
          >
            {renderPageContent()}
          </div>
        </div>

      </div>

      {/* Full Screen Modal View */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-bold font-urdu text-sm sm:text-base">{displayTitle} (مکمل معائنہ)</span>
            </div>

            <button
              onClick={() => setIsFullScreen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold font-urdu transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>{t.exitFullScreen}</span>
            </button>
          </div>

          <div className="flex-1 flex justify-center items-center py-4">
            <div className="w-full max-w-xl">
              {renderPageContent()}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-white text-xs font-urdu border-t border-white/10 pt-4">
            <button
              onClick={handlePrevPage}
              disabled={currentIdx === 0}
              className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-30 font-bold cursor-pointer"
            >
              {t.prevPage}
            </button>

            <span className="font-mono text-amber-300 font-bold">
              {currentIdx + 1} / {pageOrder.length}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentIdx === pageOrder.length - 1}
              className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-30 font-bold cursor-pointer"
            >
              {t.nextPage}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
