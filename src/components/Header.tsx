import React from 'react';
import { Language } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Feather, Globe } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  t: TranslationDictionary;
}

export const Header: React.FC<HeaderProps> = ({ language, onLanguageChange, t }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Mark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-md bg-[#0F172A] text-[#D4AF37] flex items-center justify-center shadow-sm border border-[#D4AF37]/30">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold font-brand tracking-tight text-[#0F172A] block leading-none">
              Qalam AI
            </span>
            <span className="text-[10px] text-amber-800 font-urdu font-medium tracking-wide block mt-0.5 sm:hidden">
              قلم اے آئی
            </span>
          </div>
        </div>

        {/* Zone 2: Tagline (Center) */}
        <div className="hidden md:flex items-center text-center px-4">
          <p className="text-sm font-urdu font-medium text-slate-600 tracking-wide text-balance">
            {t.headerTagline}
          </p>
        </div>

        {/* Zone 3: Language Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-200/60 p-1 rounded-lg border border-slate-300/60">
          <Globe className="w-3.5 h-3.5 text-slate-500 ml-1 mr-0.5 hidden sm:inline-block" />
          
          <button
            onClick={() => onLanguageChange('ur')}
            className={`px-2.5 py-1 text-xs font-urdu font-semibold rounded-md transition-all whitespace-nowrap ${
              language === 'ur'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اردو
          </button>
          
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 text-xs font-english font-semibold rounded-md transition-all whitespace-nowrap ${
              language === 'en'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-2.5 py-1 text-xs font-arabic font-semibold rounded-md transition-all whitespace-nowrap ${
              language === 'ar'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العربية
          </button>
        </div>

      </div>
    </header>
  );
};
