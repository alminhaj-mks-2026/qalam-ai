import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { Cpu, FileDown, Share2, Sparkles, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface FinalActionAreaProps {
  t: TranslationDictionary;
  onGenerateBook: () => void;
  isGeneratingBook: boolean;
  generationStatusText: string | null;
  generationError: string | null;
  onExportPdf: (e?: React.MouseEvent) => void;
  onShareBook: (e?: React.MouseEvent) => void;
  isExportingPdf?: boolean;
  isSharingPdf?: boolean;
  pdfStatusMessage?: string | null;
}

export const FinalActionArea: React.FC<FinalActionAreaProps> = ({
  t,
  onGenerateBook,
  isGeneratingBook,
  generationStatusText,
  generationError,
  onExportPdf,
  onShareBook,
  isExportingPdf = false,
  isSharingPdf = false,
  pdfStatusMessage = null,
}) => {
  return (
    <section className="py-12 px-4 sm:px-6 bg-[#0F172A] text-white">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-urdu font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.actionHeading}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-urdu text-white">
            اپنے مسودے کو کتاب کی شکل دینے کے لیے تیار ہیں؟
          </h2>

          <p className="text-xs sm:text-sm font-urdu text-slate-300 max-w-xl mx-auto">
            {t.actionSubtitle}
          </p>
        </div>

        {/* Status Indicator Banner */}
        {isGeneratingBook && generationStatusText && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-urdu flex items-center justify-center gap-2.5 max-w-md mx-auto animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
            <span>{generationStatusText}</span>
          </div>
        )}

        {/* PDF Status Message Display */}
        {pdfStatusMessage && (
          <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-xs sm:text-sm font-urdu flex items-center justify-center gap-2.5 max-w-lg mx-auto text-center">
            {(isExportingPdf || isSharingPdf) && <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />}
            <span>{pdfStatusMessage}</span>
          </div>
        )}

        {/* Real Error Display */}
        {generationError && (
          <div className="p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-urdu flex items-center justify-center gap-2.5 max-w-lg mx-auto text-right rtl:text-right ltr:text-left">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* 1. Build Book */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGenerateBook();
            }}
            disabled={isGeneratingBook || isExportingPdf || isSharingPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold font-urdu text-base rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGeneratingBook ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>کتاب تیار کی جا رہی ہے...</span>
              </>
            ) : (
              <>
                <Cpu className="w-5 h-5" />
                <span>{t.generateBookBtn}</span>
              </>
            )}
          </button>

          {/* 2. Get PDF */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExportPdf(e);
            }}
            disabled={isGeneratingBook || isExportingPdf || isSharingPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold font-urdu text-base rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                <span>پی ڈی ایف بن رہی ہے...</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5 text-[#D4AF37]" />
                <span>{t.getPdfBtn}</span>
              </>
            )}
          </button>

          {/* 3. Share Book */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShareBook(e);
            }}
            disabled={isGeneratingBook || isExportingPdf || isSharingPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold font-urdu text-base rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSharingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                <span>فائل تیار ہو رہی ہے...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-300" />
                <span>{t.shareBookBtn}</span>
              </>
            )}
          </button>
        </div>

        {/* Real Architecture Status Badge */}
        <div className="pt-4 flex items-center justify-center gap-2 text-xs font-urdu text-amber-200/90">
          <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
          <span>برائے راست Gemini AI پروسیسنگ اور محفوظ سرور سائیڈ کنیکشن فعال ہے</span>
        </div>

      </div>
    </section>
  );
};
