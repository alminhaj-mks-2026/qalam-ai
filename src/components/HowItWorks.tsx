import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { FileText, Cpu, BookCheck, FileDown } from 'lucide-react';

interface HowItWorksProps {
  t: TranslationDictionary;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ t }) => {
  const steps = [
    {
      num: '۱',
      enNum: '01',
      title: t.step1Title,
      desc: t.step1Desc,
      icon: FileText,
    },
    {
      num: '۲',
      enNum: '02',
      title: t.step2Title,
      desc: t.step2Desc,
      icon: Cpu,
    },
    {
      num: '۳',
      enNum: '03',
      title: t.step3Title,
      desc: t.step3Desc,
      icon: BookCheck,
    },
    {
      num: '۴',
      enNum: '04',
      title: t.step4Title,
      desc: t.step4Desc,
      icon: FileDown,
    },
  ];

  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold font-urdu text-[#0F172A] tracking-tight">
            {t.howItWorksTitle}
          </h2>
          <p className="text-xs sm:text-sm font-urdu text-slate-600 mt-1">
            {t.howItWorksSubtitle}
          </p>
        </div>

        {/* 4 Steps Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs relative flex flex-col items-start hover:border-[#D4AF37]/60 transition-all group"
              >
                {/* Step Number & Icon Header */}
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0F172A] flex items-center justify-center font-bold text-lg group-hover:bg-[#0F172A] group-hover:text-[#D4AF37] transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-urdu text-[#D4AF37] bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                    مرحلہ {step.num}
                  </span>
                </div>

                {/* Step Title */}
                <h3 className="text-base font-bold font-urdu text-[#0F172A] mb-1.5">
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-xs font-urdu text-slate-600 leading-relaxed">
                  {step.desc}
                </p>

                {/* Connector arrow for larger screens */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none z-10 rtl:right-auto rtl:-left-3 rtl:rotate-180">
                    <span className="text-xl">←</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
