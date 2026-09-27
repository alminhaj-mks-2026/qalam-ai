import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { Feather } from 'lucide-react';

interface FooterProps {
  t: TranslationDictionary;
}

export const Footer: React.FC<FooterProps> = ({ t }) => {
  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-[#D4AF37]/20 py-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
        
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-bold font-brand tracking-tight text-white block leading-none">
              Qalam AI
            </span>
            <span className="text-xs font-urdu text-slate-400 mt-0.5 block">
              {t.footerTagline}
            </span>
          </div>
        </div>

        {/* Minimal Copyright */}
        <p className="text-xs font-urdu text-slate-400">
          {t.footerRights}
        </p>

      </div>
    </footer>
  );
};
