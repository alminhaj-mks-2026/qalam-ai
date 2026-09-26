import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { ChapterOutline } from '../types';
import { Layers, Plus, Trash2, ListTree, BookOpenText, CheckCircle2, Sliders } from 'lucide-react';

interface BookStructureSectionProps {
  t: TranslationDictionary;
  chapters: ChapterOutline[];
  setChapters: React.Dispatch<React.SetStateAction<ChapterOutline[]>>;
  prefaceNote: string;
  setPrefaceNote: (val: string) => void;
  conclusionNote: string;
  setConclusionNote: (val: string) => void;
}

export const BookStructureSection: React.FC<BookStructureSectionProps> = ({
  t,
  chapters,
  setChapters,
  prefaceNote,
  setPrefaceNote,
  conclusionNote,
  setConclusionNote,
}) => {
  const addChapter = () => {
    const nextNum = chapters.length + 1;
    const newChap: ChapterOutline = {
      id: Math.random().toString(36).substr(2, 9),
      title: `باب ${nextNum}: نئے موضوع کی تفصیل`,
      subheadings: ['ذیلی عنوان ۱', 'ذیلی عنوان ۲'],
    };
    setChapters([...chapters, newChap]);
  };

  const removeChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters(chapters.filter((c) => c.id !== id));
  };

  const updateChapterTitle = (id: string, newTitle: string) => {
    setChapters(
      chapters.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const addSubheading = (chapId: string) => {
    setChapters(
      chapters.map((c) => {
        if (c.id === chapId) {
          return {
            ...c,
            subheadings: [...c.subheadings, `نیا ذیلی عنوان ${c.subheadings.length + 1}`],
          };
        }
        return c;
      })
    );
  };

  const removeSubheading = (chapId: string, subIdx: number) => {
    setChapters(
      chapters.map((c) => {
        if (c.id === chapId) {
          const nextSubs = [...c.subheadings];
          nextSubs.splice(subIdx, 1);
          return { ...c, subheadings: nextSubs };
        }
        return c;
      })
    );
  };

  const updateSubheading = (chapId: string, subIdx: number, val: string) => {
    setChapters(
      chapters.map((c) => {
        if (c.id === chapId) {
          const nextSubs = [...c.subheadings];
          nextSubs[subIdx] = val;
          return { ...c, subheadings: nextSubs };
        }
        return c;
      })
    );
  };

  return (
    <section className="py-10 px-4 sm:px-6 bg-white border-y border-slate-200/80">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-[#D4AF37] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-urdu text-[#0F172A]">
                {t.structureHeading}
              </h2>
              <p className="text-xs font-urdu text-slate-600 mt-0.5">
                {t.structureSubtitle}
              </p>
            </div>
          </div>

          <div className="text-xs font-urdu text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            {t.targetChaptersLabel} <strong className="text-slate-900 font-mono">{chapters.length}</strong>
          </div>
        </div>

        {/* Structure Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs font-urdu font-medium">
          <div className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-xl flex flex-col items-center gap-1">
            <BookOpenText className="w-4 h-4 text-amber-700" />
            <span className="text-[#0F172A] font-bold">{t.structureIntro}</span>
          </div>

          <div className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-xl flex flex-col items-center gap-1">
            <ListTree className="w-4 h-4 text-amber-700" />
            <span className="text-[#0F172A] font-bold">{t.structureTOC}</span>
          </div>

          <div className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-xl flex flex-col items-center gap-1">
            <Layers className="w-4 h-4 text-amber-700" />
            <span className="text-[#0F172A] font-bold">{t.structureChapters} ({chapters.length})</span>
          </div>

          <div className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-xl flex flex-col items-center gap-1">
            <Sliders className="w-4 h-4 text-amber-700" />
            <span className="text-[#0F172A] font-bold">{t.structureHeadings}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 bg-[#FBF9F5] border border-slate-200 rounded-xl flex flex-col items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-amber-700" />
            <span className="text-[#0F172A] font-bold">{t.structureConclusion}</span>
          </div>
        </div>

        {/* Introduction / Preface Field */}
        <div className="bg-[#FBF9F5] p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold font-urdu text-slate-800">
            {t.structureIntro} (دیباچہ کا مرکزی نکتہ)
          </label>
          <input
            type="text"
            value={prefaceNote}
            onChange={(e) => setPrefaceNote(e.target.value)}
            placeholder="مثلاً: اس کتاب کا بنیادی مقصد سائنس اور حکمتِ عملی میں ربط قائم کرنا ہے..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* Chapters & Headings Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-urdu text-slate-800">
              {t.structureChapters} و {t.structureHeadings}
            </h3>

            <button
              onClick={addChapter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] text-[#D4AF37] hover:bg-slate-800 text-xs font-bold font-urdu rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addChapterBtn}</span>
            </button>
          </div>

          <div className="space-y-3">
            {chapters.map((chap, cIdx) => (
              <div
                key={chap.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded bg-amber-100 text-[#0F172A] font-bold font-urdu text-xs flex items-center justify-center shrink-0">
                      {cIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={chap.title}
                      onChange={(e) => updateChapterTitle(chap.id, e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-bold font-urdu border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  {chapters.length > 1 && (
                    <button
                      onClick={() => removeChapter(chap.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                      title={t.removeChapterBtn}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Subheadings list */}
                <div className="pl-8 rtl:pr-8 rtl:pl-0 space-y-2 border-r-2 rtl:border-r-2 rtl:border-l-0 border-amber-200/80">
                  <div className="text-[11px] font-bold font-urdu text-slate-500">
                    {t.structureHeadings}:
                  </div>

                  {chap.subheadings.map((sub, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">•</span>
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) => updateSubheading(chap.id, sIdx, e.target.value)}
                        placeholder={t.subheadingPlaceholder}
                        className="flex-1 px-2.5 py-1 text-xs font-urdu bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-[#0F172A]"
                      />
                      {chap.subheadings.length > 1 && (
                        <button
                          onClick={() => removeSubheading(chap.id, sIdx)}
                          className="text-slate-300 hover:text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => addSubheading(chap.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold font-urdu text-amber-800 hover:text-[#0F172A] pt-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ذیلی عنوان کا اضافہ کریں</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion / Summary Note */}
        <div className="bg-[#FBF9F5] p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold font-urdu text-slate-800">
            {t.structureConclusion} (حاصلِ کلام / اختتامیہ کا خاکہ)
          </label>
          <input
            type="text"
            value={conclusionNote}
            onChange={(e) => setConclusionNote(e.target.value)}
            placeholder="مثلاً: اختتامی فصل میں تمام عملی سفارشات اور خلاصہ پیش کیا جائے گا..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
          />
        </div>

      </div>
    </section>
  );
};
