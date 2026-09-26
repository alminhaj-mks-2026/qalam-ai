import React, { useState } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { BookGenre, Language } from '../types';
import { Sparkles, Check, Type, Edit3, Lightbulb, Loader2 } from 'lucide-react';
import { suggestTitlesWithGemini, TitleSuggestion } from '../services/aiService';

interface BookTitleSectionProps {
  t: TranslationDictionary;
  title: string;
  setTitle: (t: string) => void;
  subtitle: string;
  setSubtitle: (st: string) => void;
  genre: BookGenre;
  rawText?: string;
  language?: Language;
}

export const BookTitleSection: React.FC<BookTitleSectionProps> = ({
  t,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  genre,
  rawText = '',
  language = 'ur',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<TitleSuggestion[] | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const handleFetchAiSuggestions = async () => {
    setShowSuggestions(true);
    if (!rawText.trim()) {
      setSuggestionError('عنوانات کی تجاویز کے لیے پہلے کچھ تحریر داخل کریں۔');
      return;
    }

    setIsLoadingAiSuggestions(true);
    setSuggestionError(null);
    try {
      const results = await suggestTitlesWithGemini({
        content: rawText,
        genre,
        language,
      });
      setAiSuggestions(results);
    } catch (err: any) {
      setSuggestionError(err.message || 'عنوانات کی تجاویز موصول نہیں ہو سکیں۔');
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  // High-quality contextual fallback title recommendations based on selected genre
  const getGenreSuggestions = (): TitleSuggestion[] => {
    switch (genre) {
      case 'academic':
        return [
          { title: 'تحقیق کا سفر اور جدید سائنسی منہاج', subtitle: 'نظریہ، تاریخ اور عملی تطبیق' },
          { title: 'حکمتِ علم اور عصری دانش', subtitle: 'جدید علمی فکر کا فکری تجزیہ' },
          { title: 'اصولِ تحقیق و نگارش', subtitle: 'مقالہ نگاری اور سائنسی اسلوب' },
        ];
      case 'islamic':
        return [
          { title: 'المنہاج: علم سے حقیقی مہارت تک', subtitle: 'اسلامی علوم و حکمت کی روشنی میں' },
          { title: 'فکر و ہدایت کی شمعیں', subtitle: 'سیرت، اخلاق اور معاصر مسائل کا حل' },
          { title: 'احکام و بصیرت', subtitle: 'جدید دور میں اسلامی تعلیمات کا انطباق' },
        ];
      case 'literary':
        return [
          { title: 'خاموش نغمے اور حرف و صوت', subtitle: 'شاعری و نژادِ فکر کا مجموعہ' },
          { title: 'قلم کی زبانی', subtitle: 'افسانے، داستانیں اور یادیں' },
          { title: 'دشتِ خیال کی پکار', subtitle: 'ادبی شاہکاروں کا معاصر تناظر' },
        ];
      case 'self_help':
        return [
          { title: 'خود شناسی اور کامیابی کی چابی', subtitle: 'شخصیت کی تعمیر اور مقاصد کا حصول' },
          { title: 'ارادے کی طاقت', subtitle: 'روزمرہ زندگی میں مثبت تبدیلی کا راستہ' },
          { title: 'ذہن کی بیداری', subtitle: 'پُرعزم زندگی گزارنے کے عملی اصول' },
        ];
      case 'business':
        return [
          { title: 'قیادت اور جدید کاروبار کا سفر', subtitle: 'کاروباری حکمتِ عملی اور بصیرت' },
          { title: 'کاروبار کی دنیا اور نوآوری', subtitle: 'ڈیجیٹل دور میں ترقی کے راستے' },
          { title: 'مالیاتی بیداری اور استقلال', subtitle: 'سرمایہ کاری کے سنہری قوانین' },
        ];
      case 'memoir':
        return [
          { title: 'زندگی کا سفر اور نقشِ قدم', subtitle: 'تجربات، مشاہدات اور سبق آموز لمحے' },
          { title: 'کتابِ زیست کے روشن اوراق', subtitle: 'ایک یادگار سوانحی داستان' },
          { title: 'زمانہ کے ساتھ چلتے ہوئے', subtitle: 'ایک منفرد سفر کی روداد' },
        ];
      default:
        return [
          { title: 'علم، تحریر اور خیالات کا شاہکار', subtitle: 'ایک منظم اور مفصل مطالعہ' },
          { title: 'حکمت و دانش کی روشن راہیں', subtitle: 'فکر و عمل کی جامع گائیڈ' },
          { title: 'افکارِ نو اور جدید دنیا', subtitle: 'عصری موضوعات پر سیر حاصل جائزہ' },
        ];
    }
  };

  const suggestions = aiSuggestions || getGenreSuggestions();

  const handleSelectSuggestion = (sTitle: string, sSubtitle: string) => {
    setTitle(sTitle);
    setSubtitle(sSubtitle);
  };

  return (
    <section className="py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        
        {/* Section Title */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-[#D4AF37] flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold font-urdu text-[#0F172A]">
              {t.bookTitleHeading}
            </h2>
          </div>

          <button
            onClick={handleFetchAiSuggestions}
            disabled={isLoadingAiSuggestions}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-[#0F172A] border border-amber-300/80 text-xs font-bold font-urdu rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoadingAiSuggestions ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            )}
            <span>{isLoadingAiSuggestions ? 'تجویز کی جا رہی ہے...' : t.aiSuggestTitleBtn}</span>
          </button>
        </div>

        {/* Custom Input Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.bookTitleLabel} *
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.bookTitlePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm font-urdu font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              />
              <Edit3 className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-auto rtl:left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.bookSubtitleLabel}
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={t.bookSubtitlePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm font-urdu bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>
        </div>

        {/* AI Suggested Titles Drawer */}
        {showSuggestions && (
          <div className="bg-[#FBF9F5] p-4 sm:p-5 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold font-urdu text-[#0F172A]">
                <Lightbulb className="w-4 h-4 text-[#D4AF37]" />
                <span>{t.suggestedTitlesHeading}</span>
              </div>
              {isLoadingAiSuggestions && (
                <span className="text-xs text-amber-700 font-urdu animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gemini AI عنوانات تیار کر رہا ہے...
                </span>
              )}
            </div>

            {suggestionError && (
              <p className="text-xs font-urdu text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {suggestionError}
              </p>
            )}
            
            <p className="text-xs font-urdu text-slate-600">
              {t.selectTitlePrompt}
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {suggestions.map((item, idx) => {
                const isSelected = title === item.title;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item.title, item.subtitle)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-[#D4AF37]/80'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold font-urdu">{item.title}</h4>
                      <p className={`text-xs font-urdu mt-0.5 ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                        {item.subtitle}
                      </p>
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#D4AF37] text-[#0F172A]' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
