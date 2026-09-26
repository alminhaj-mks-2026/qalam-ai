import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { Feather, Check, ArrowRight, ShieldCheck, Cpu, Code2 } from 'lucide-react';

interface PhaseInfoModalProps {
  t: TranslationDictionary;
  actionType: 'build' | 'pdf' | 'share' | null;
  onClose: () => void;
}

export const PhaseInfoModal: React.FC<PhaseInfoModalProps> = ({ t, actionType, onClose }) => {
  if (!actionType) return null;

  const getTitle = () => {
    switch (actionType) {
      case 'build':
        return 'کتاب کا خاکہ تیار ہے (Phase 1 Ready)';
      case 'pdf':
        return 'پی ڈی ایف جنریشن کنفیگریشن (PDF Export)';
      case 'share':
        return 'شیئرنگ فریم ورک (Share Link)';
    }
  };

  const getActionDetails = () => {
    switch (actionType) {
      case 'build':
        return 'آپ کی فراہم کردہ تحریر، عنوان اور ابواب کا اسٹرکچر کامیابی سے مرتب کر لیا گیا ہے۔ اگلے مرحلے میں Gemini AI کا ماڈل اس مواد کو ابواب میں تقسیم اور تفصیلی ایڈیٹنگ کرے گا۔';
      case 'pdf':
        return 'پی ڈی ایف رپورٹ لے آؤٹ اور نشتالیق فاؤنڈیشن مرتب ہو چکی ہے۔ اگلے مرحلے میں لائیو PDF کلائنٹ ایکسپورٹر اس بٹن سے منسلک ہوگا۔';
      case 'share':
        return 'کتاب کا منفرد میٹا لنک فریم ورک تیار ہے۔ لائیو ڈیٹا بیس اور کلائوڈ اسٹوریج کے بعد یہ لنک عوامی طور پر شیئر ہو سکے گا۔';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Icon */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#D4AF37] flex items-center justify-center font-bold">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-urdu text-[#0F172A]">
              {getTitle()}
            </h3>
            <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Qalam AI Architecture
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3 text-xs sm:text-sm font-urdu leading-relaxed text-slate-700">
          <p className="bg-[#FBF9F5] p-3.5 rounded-xl border border-slate-200 text-slate-800">
            {getActionDetails()}
          </p>

          <div className="space-y-2 pt-1">
            <div className="font-bold text-[#0F172A] text-xs">
              پہلے مرحلے میں مکمل شدہ خصوصیات:
            </div>
            
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>مکمل رسپانسو موبائل فرسٹ انٹرپلیس (RTL اردو و عربی)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تحریر، فائلز (PDF, DOCX, TXT) اور وائس اپ لوڈ کی ساخت</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>عنوانات، دیباچہ، ابواب اور ذیلی سرخیوں کا اسٹرکچر بلڈر</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>کتاب کا لائیو ڈائریکٹ پریویو، زومنگ اور فل اسکرین ویو</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] font-urdu text-slate-500 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>اگلے مرحلے (Phase 2) میں لائیو AI، اسپیچ ٹو ٹیکسٹ اور پی ڈی ایف جنریشن ڈائریکٹ منسلک ہوگی۔</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] font-bold font-urdu text-sm rounded-xl transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
};
