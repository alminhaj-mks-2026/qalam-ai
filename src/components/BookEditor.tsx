import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { ChapterOutline } from '../types';
import { Edit3, BookOpen, Save, Layers, CheckCircle2 } from 'lucide-react';

interface BookEditorProps {
  t: TranslationDictionary;
  title: string;
  setTitle: (t: string) => void;
  subtitle: string;
  setSubtitle: (st: string) => void;
  authorName: string;
  setAuthorName: (a: string) => void;
  prefaceNote: string;
  setPrefaceNote: (p: string) => void;
  conclusionNote: string;
  setConclusionNote: (c: string) => void;
  chapters: ChapterOutline[];
  setChapters: React.Dispatch<React.SetStateAction<ChapterOutline[]>>;
  onDoneEditing: () => void;
}

export const BookEditor: React.FC<BookEditorProps> = ({
  t,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  authorName,
  setAuthorName,
  prefaceNote,
  setPrefaceNote,
  conclusionNote,
  setConclusionNote,
  chapters,
  setChapters,
  onDoneEditing,
}) => {
  const handleUpdateChapterTitle = (index: number, newTitle: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
  };

  const handleUpdateSectionContent = (chapIndex: number, secIndex: number, newContent: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      const chap = { ...updated[chapIndex] };
      if (chap.sections) {
        const sections = [...chap.sections];
        sections[secIndex] = { ...sections[secIndex], content: newContent };
        chap.sections = sections;
      }
      updated[chapIndex] = chap;
      return updated;
    });
  };

  const handleUpdateSectionHeading = (chapIndex: number, secIndex: number, newHeading: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      const chap = { ...updated[chapIndex] };
      if (chap.sections) {
        const sections = [...chap.sections];
        sections[secIndex] = { ...sections[secIndex], heading: newHeading };
        chap.sections = sections;
      }
      updated[chapIndex] = chap;
      return updated;
    });
  };

  return (
    <section id="book-editor" className="py-8 px-4 sm:px-6 bg-white border-y border-slate-200">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#D4AF37] flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-urdu text-[#0F172A]">
                مسودہ میں ترمیم (Focused Manuscript Editor)
              </h2>
              <p className="text-xs font-urdu text-slate-600">
                تیار شدہ کتاب کا متن، عنوانات اور تحریر یہاں براہِ راست ایڈٹ کریں۔
              </p>
            </div>
          </div>

          <button
            onClick={onDoneEditing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] font-bold font-urdu text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ترمیم مکمل کریں اور کتاب دیکھیں</span>
          </button>
        </div>

        {/* 1. Book Metadata Editing */}
        <div className="bg-[#FBF9F5] p-5 rounded-2xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold font-urdu text-[#0F172A] flex items-center gap-2 border-b border-slate-200 pb-2">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>کتاب کے عمومی برائوزر و عنوانات</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
                کتاب کا عنوان
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-bold font-urdu bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
                ذیلی عنوان
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-urdu bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
                مصنف کا نام
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-urdu bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* 2. Preface / Introduction */}
        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80 space-y-2">
          <label className="block text-xs font-bold font-urdu text-amber-900">
            دیباچہ و پیش لفظ (Preface / Introduction)
          </label>
          <textarea
            value={prefaceNote}
            onChange={(e) => setPrefaceNote(e.target.value)}
            rows={3}
            className="w-full p-3.5 text-sm font-urdu leading-relaxed bg-white border border-amber-300/80 rounded-xl focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* 3. Chapters & Content Editor */}
        <div className="space-y-4">
          <h3 className="text-base font-bold font-urdu text-[#0F172A] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
            <span>ابواب اور متن کی ترمیم ({chapters.length} ابواب)</span>
          </h3>

          <div className="space-y-4">
            {chapters.map((chap, chIdx) => (
              <div
                key={chap.id || chIdx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
              >
                {/* Chapter Title */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#0F172A] text-[#D4AF37] font-bold font-urdu text-xs flex items-center justify-center shrink-0">
                    {chIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={chap.title}
                    onChange={(e) => handleUpdateChapterTitle(chIdx, e.target.value)}
                    className="flex-1 px-3.5 py-2 text-base font-bold font-urdu bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                {/* Chapter Sections */}
                {chap.sections && chap.sections.length > 0 ? (
                  <div className="space-y-3 pr-2 border-r-2 border-amber-300/80 rtl:border-r-2 rtl:border-l-0">
                    {chap.sections.map((sec, secIdx) => (
                      <div key={secIdx} className="space-y-2 bg-[#FBF9F5] p-3.5 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          value={sec.heading}
                          onChange={(e) => handleUpdateSectionHeading(chIdx, secIdx, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
                        />
                        <textarea
                          value={sec.content}
                          onChange={(e) => handleUpdateSectionContent(chIdx, secIdx, e.target.value)}
                          rows={4}
                          className="w-full p-3 text-xs sm:text-sm font-urdu leading-relaxed bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-urdu text-slate-500 italic p-2 bg-slate-50 rounded">
                    اس باب میں کوئی الگ ذیلی سیکشن دستیاب نہیں ہے۔
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Conclusion */}
        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80 space-y-2">
          <label className="block text-xs font-bold font-urdu text-amber-900">
            اختتامیہ و حاصلِ کلام (Conclusion)
          </label>
          <textarea
            value={conclusionNote}
            onChange={(e) => setConclusionNote(e.target.value)}
            rows={3}
            className="w-full p-3.5 text-sm font-urdu leading-relaxed bg-white border border-amber-300/80 rounded-xl focus:outline-none focus:border-[#0F172A]"
          />
        </div>

        {/* Bottom Save Action */}
        <div className="text-center pt-2">
          <button
            onClick={onDoneEditing}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] font-bold font-urdu text-base rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>ترمیم محفوظ کریں اور کتاب کا جائزہ لیں</span>
          </button>
        </div>
      </div>
    </section>
  );
};
