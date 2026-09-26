import React, { useRef } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { InputMode, BookGenre, AttachedFile } from '../types';
import { FileText, Upload, Mic, Trash2, CheckCircle2, FileCode, Music, Info, Plus, Cpu, Loader2, AlertCircle } from 'lucide-react';

interface WorkspaceProps {
  t: TranslationDictionary;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  rawText: string;
  setRawText: (text: string) => void;
  authorName: string;
  setAuthorName: (name: string) => void;
  genre: BookGenre;
  setGenre: (genre: BookGenre) => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  onGenerateBook?: () => void;
  isGeneratingBook?: boolean;
  generationError?: string | null;
  generationStatusText?: string | null;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  t,
  inputMode,
  setInputMode,
  rawText,
  setRawText,
  authorName,
  setAuthorName,
  genre,
  setGenre,
  attachedFiles,
  setAttachedFiles,
  onGenerateBook,
  isGeneratingBook = false,
  generationError = null,
  generationStatusText = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: 'document' | 'audio') => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: AttachedFile['type'] = 'txt';
      if (['pdf', 'docx', 'txt', 'mp3', 'wav', 'm4a'].includes(ext)) {
        type = ext as AttachedFile['type'];
      }

      if (type === 'txt') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const fileContent = event.target?.result as string;
          if (fileContent) {
            setRawText(rawText ? `${rawText}\n\n${fileContent}` : fileContent);
            setAttachedFiles((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type,
                category,
                uploadDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: fileContent,
              },
            ]);
          }
        };
        reader.readAsText(file);
      } else {
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type,
            category,
            uploadDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    });
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const genresList: { id: BookGenre; label: string }[] = [
    { id: 'academic', label: t.genreAcademic },
    { id: 'islamic', label: t.genreIslamic },
    { id: 'literary', label: t.genreLiterary },
    { id: 'self_help', label: t.genreSelfHelp },
    { id: 'business', label: t.genreBusiness },
    { id: 'memoir', label: t.genreMemoir },
    { id: 'general', label: t.genreGeneral },
  ];

  return (
    <section id="workspace" className="py-10 px-4 sm:px-6 bg-white border-y border-slate-200/80">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-urdu text-[#0F172A]">
                {t.workspaceTitle}
              </h2>
              <p className="text-xs sm:text-sm font-urdu text-slate-600 mt-1">
                {t.workspaceSubtitle}
              </p>
            </div>
            
            <div className="text-xs font-urdu text-[#D4AF37] bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
              {t.phase1Notice}
            </div>
          </div>
        </div>

        {/* Author & Genre Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FBF9F5] p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.authorLabel}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={t.authorPlaceholder}
              className="w-full px-3.5 py-2 text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.genreLabel}
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as BookGenre)}
              className="w-full px-3.5 py-2 text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            >
              {genresList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 min-w-[140px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 ${
              inputMode === 'text'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.tabText}</span>
          </button>

          <button
            onClick={() => setInputMode('file')}
            className={`flex-1 min-w-[140px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 ${
              inputMode === 'file'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{t.tabFile}</span>
          </button>

          <button
            onClick={() => setInputMode('audio')}
            className={`flex-1 min-w-[140px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 ${
              inputMode === 'audio'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{t.tabAudio}</span>
          </button>
        </div>

        {/* TAB 1: TEXT AREA */}
        {inputMode === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-urdu text-slate-700">
                {t.textInputLabel}
              </label>
              <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                <span>{t.wordCountLabel}: <strong className="text-slate-900">{wordCount}</strong></span>
                <span>·</span>
                <span>{t.charCountLabel}: <strong className="text-slate-900">{charCount}</strong></span>
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={t.textInputPlaceholder}
              rows={8}
              className="w-full p-4 text-sm font-urdu leading-relaxed bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] resize-y shadow-xs"
            />
          </div>
        )}

        {/* TAB 2: FILE UPLOAD */}
        {inputMode === 'file' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e, 'document')}
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0F172A] bg-[#FBF9F5] rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-amber-50/30 group"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 text-[#0F172A] flex items-center justify-center mb-3 group-hover:bg-[#0F172A] group-hover:text-[#D4AF37] transition-colors">
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold font-urdu text-[#0F172A] mb-1">
                {t.fileUploadTitle}
              </h3>
              <p className="text-xs font-urdu text-slate-600 mb-3">
                {t.fileUploadSubtitle}
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-[#D4AF37] text-xs font-bold font-urdu rounded-lg shadow-xs">
                <Plus className="w-4 h-4" />
                <span>{t.fileSelectBtn}</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">PDF</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">DOCX</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">TXT</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIO UPLOAD */}
        {inputMode === 'audio' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => handleFileUpload(e, 'audio')}
              accept=".mp3,.wav,.m4a"
              multiple
              className="hidden"
            />

            <div
              onClick={() => audioInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0F172A] bg-[#FBF9F5] rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-amber-50/30 group"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-[#0F172A] flex items-center justify-center mb-3 group-hover:bg-[#0F172A] group-hover:text-[#D4AF37] transition-colors">
                <Mic className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold font-urdu text-[#0F172A] mb-1">
                {t.audioUploadTitle}
              </h3>
              <p className="text-xs font-urdu text-slate-600 mb-3">
                {t.audioUploadSubtitle}
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-[#D4AF37] text-xs font-bold font-urdu rounded-lg shadow-xs">
                <Music className="w-4 h-4" />
                <span>{t.audioRecordBtn}</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">MP3</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">WAV</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700">M4A</span>
              </div>
            </div>
          </div>
        )}

        {/* ATTACHED FILES LIST */}
        {attachedFiles.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold font-urdu text-slate-700 mb-2">
              منسلک کردہ فائلیں ({attachedFiles.length}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-urdu"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {file.category === 'audio' ? (
                      <Music className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <FileCode className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">
                      {file.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {(file.size / 1024).toFixed(0)}KB
                    </span>
                  </div>

                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    title="حذف کریں"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Gemini Book Generation Action Button */}
        {onGenerateBook && (
          <div className="bg-[#0F172A] p-5 rounded-2xl border border-[#D4AF37]/40 shadow-xl space-y-3 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-right rtl:text-right ltr:text-left">
                <h3 className="text-base font-bold font-urdu text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#D4AF37]" />
                  <span>Gemini AI سے حقیقی کتاب تیار کریں</span>
                </h3>
                <p className="text-xs font-urdu text-slate-300 mt-0.5">
                  تمام مواد کا تجزیہ کر کے خوبصورت ابواب، فہرست مضامین اور مکمل کتاب تشکیل دیں۔
                </p>
              </div>

              <button
                onClick={onGenerateBook}
                disabled={isGeneratingBook}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold font-urdu text-sm sm:text-base rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0"
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
            </div>

            {/* Status Indicator */}
            {isGeneratingBook && generationStatusText && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-urdu flex items-center justify-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>{generationStatusText}</span>
              </div>
            )}

            {/* Real Error Display */}
            {generationError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-urdu flex items-center gap-2.5 text-right rtl:text-right ltr:text-left">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{generationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Real AI Integration Info Banner */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="text-xs font-urdu text-amber-900 leading-relaxed">
            <strong className="block mb-0.5">برائے راست Gemini 3.8 Flash AI کنیکشن:</strong>
            آپ کی داخل کردہ تحریر براہِ راست گوگل کے آفیشل Gemini AI ماڈل کے پاس جائے گی اور اسے منطقی ابواب، عنوانات اور مکمل کتاب میں ترتیب دیا جائے گا۔
          </div>
        </div>

      </div>
    </section>
  );
};
