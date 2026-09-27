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
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F172A] text-[#D4AF37] flex items-center justify-center shadow-xs border border-[#D4AF37]/30">
            <Feather className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-bold font-brand tracking-tight text-[#0F172A] block leading-none">
              Qalam AI
            </span>
            <span className="text-[10px] text-amber-800 font-urdu font-medium tracking-wide block mt-0.5 sm:hidden">
              قلم اے آئی
            </span>
          </div>
        </div>

        {/* Zone 2: Tagline (Center - Desktop) */}
        <div className="hidden md:flex items-center text-center px-4">
          <p className="text-xs sm:text-sm font-urdu font-medium text-slate-600 tracking-wide text-balance">
            {t.headerTagline}
          </p>
        </div>

        {/* Zone 3: Single Compact Language Selector */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-200/70 p-1 rounded-lg border border-slate-300/70 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-slate-600 ml-1.5 mr-0.5 shrink-0" />
          
          <button
            onClick={() => onLanguageChange('ur')}
            className={`px-2.5 py-1 text-xs font-urdu font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              language === 'ur'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            اردو
          </button>
          
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2 py-1 text-xs font-english font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              language === 'en'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            EN
          </button>
          
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-2 py-1 text-xs font-arabic font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              language === 'ar'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            عربي
          </button>
        </div>

      </div>
    </header>
  );
};
