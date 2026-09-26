import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { BookOpen, Sparkles, ArrowDown } from 'lucide-react';

interface HeroProps {
  t: TranslationDictionary;
  onStartClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ t, onStartClick }) => {
  return (
    <section className="relative pt-8 sm:pt-14 pb-10 sm:pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="bg-[#0F172A] text-slate-100 rounded-2xl p-6 sm:p-12 border border-[#D4AF37]/30 shadow-xl relative overflow-hidden">
          
          {/* Subtle gold line accent at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80" />
          
          <div className="text-center space-y-6 relative z-10">
            
            {/* Subtle Brand Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-brand text-xs uppercase tracking-wider">Qalam AI Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-urdu text-white leading-relaxed sm:leading-snug text-balance">
              {t.heroHeading}
            </h1>

            {/* Description */}
            <p className="text-slate-300 text-sm sm:text-lg font-urdu leading-relaxed max-w-2xl mx-auto text-balance">
              {t.heroDescription}
            </p>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                onClick={onStartClick}
                className="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-[#D4AF37] text-[#0F172A] hover:bg-[#c49f2e] font-bold font-urdu text-base sm:text-lg rounded-xl shadow-lg transition-all transform active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-5 h-5" />
                <span>{t.createBookBtn}</span>
                <ArrowDown className="w-4 h-4 opacity-70 animate-bounce" />
              </button>
            </div>

            {/* Simple Trust Assurance Note */}
            <p className="text-xs text-slate-400 font-urdu pt-1">
              موبائل، ٹیبلٹ اور لیپ ٹاپ پر یکساں طور پر دستياب
            </p>

          </div>

        </div>

      </div>
    </section>
  );
};
