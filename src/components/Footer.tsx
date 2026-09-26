import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { Language } from '../types';
import { Feather } from 'lucide-react';

interface FooterProps {
  t: TranslationDictionary;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Footer: React.FC<FooterProps> = ({ t, language, onLanguageChange }) => {
  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-[#D4AF37]/20 pt-12 pb-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Footer Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
          
          {/* Brand & Description */}
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <div className="w-8 h-8 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center">
                <Feather className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-brand tracking-tight text-white">
                Qalam AI
              </span>
            </div>

            <p className="text-xs sm:text-sm font-urdu text-slate-300 leading-relaxed">
              {t.footerTagline}
            </p>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
            <button
              onClick={() => onLanguageChange('ur')}
              className={`px-3 py-1 text-xs font-urdu rounded transition-colors ${
                language === 'ur' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              اردو
            </button>

            <button
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1 text-xs font-english rounded transition-colors ${
                language === 'en' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>

            <button
              onClick={() => onLanguageChange('ar')}
              className={`px-3 py-1 text-xs font-arabic rounded transition-colors ${
                language === 'ar' ? 'bg-[#D4AF37] text-[#0F172A] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>

        </div>

        <div className="h-px bg-slate-800" />

        {/* Bottom Copyright Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-urdu text-slate-500">
          <p>{t.footerRights}</p>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-amber-200/80 font-mono">{t.footerPhase1Badge}</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
