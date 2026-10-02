import React from 'react';
import { TranslationDictionary } from '../i18n/translations';

interface HowItWorksProps {
  t: TranslationDictionary;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ t }) => {
  const steps = [
    { num: '۱', title: t.step1Title || 'مواد فراہم کریں' },
    { num: '۲', title: t.step2Title || 'AI سے منظم کریں' },
    { num: '۳', title: t.step3Title || 'کتاب کا جائزہ لیں' },
    { num: '۴', title: t.step4Title || 'PDF حاصل کریں' },
  ];

  return (
    <section className="pb-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Compact & minimal 2x2 step indicator container */}
        <div className="bg-[#0F172A] p-3.5 sm:p-5 rounded-2xl border border-[#D4AF37]/30 shadow-lg">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl bg-slate-900/90 border border-[#D4AF37]/25 select-none pointer-events-none min-w-0"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D4AF37] text-[#0F172A] font-bold font-arabic text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {step.num}
                </div>
                <span className="text-[11px] sm:text-sm font-bold font-arabic text-[#F3E8C9] sm:text-white tracking-tight truncate leading-normal">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
