import React, { useRef, useState, useEffect } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { InputMode, BookGenre, AttachedFile } from '../types';
import { SupportedGeminiModel } from '../config/models';
import {
  FileText,
  Upload,
  Mic,
  Trash2,
  FileCode,
  Music,
  Cpu,
  Loader2,
  AlertCircle,
  Square,
  Volume2,
  RefreshCw,
  Clock,
  Sparkles,
  Zap,
  X
} from 'lucide-react';

export interface QuotaErrorInfo {
  isQuotaExhausted: boolean;
  message: string;
  retryAfterSeconds: number;
  model: string;
  isDailyLimit?: boolean;
}

interface WorkspaceProps {
  t: TranslationDictionary;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  rawText: string;
  setRawText: (text: string) => void;
  title: string;
  setTitle: (title: string) => void;
  authorName: string;
  setAuthorName: (name: string) => void;
  genre: BookGenre;
  setGenre: (genre: BookGenre) => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  onGenerateBook: () => void;
  onCancelGeneration?: () => void;
  isGeneratingBook: boolean;
  generationError: string | null;
  generationStatusText: string | null;
  quotaErrorInfo?: QuotaErrorInfo | null;
  onRetry?: (modelOverride?: SupportedGeminiModel) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  t,
  inputMode,
  setInputMode,
  rawText,
  setRawText,
  title,
  setTitle,
  authorName,
  setAuthorName,
  genre,
  setGenre,
  attachedFiles,
  setAttachedFiles,
  onGenerateBook,
  onCancelGeneration,
  isGeneratingBook,
  generationError,
  generationStatusText,
  quotaErrorInfo,
  onRetry,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Live Microphone Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;

  // Recording Timer Effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const newFile: AttachedFile = {
          id: Math.random().toString(36).substring(2, 9),
          name: `وائس ریکارڈنگ (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).webm`,
          size: audioBlob.size,
          type: 'wav',
          category: 'audio',
          uploadDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setAttachedFiles((prev) => [...prev, newFile]);
        // Clean stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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
                id: Math.random().toString(36).substring(2, 9),
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
            id: Math.random().toString(36).substring(2, 9),
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
    { id: 'original_content', label: t.genreOriginalContent },
  ];

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section id="workspace" className="py-8 px-4 sm:px-6 bg-white border-y border-slate-200/80">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Workspace Title */}
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold font-urdu text-[#0F172A]">
            {t.workspaceTitle}
          </h2>
          <p className="text-xs sm:text-sm font-urdu text-slate-600 mt-1">
            اپنی تحریر، فائل یا آڈیو نوٹس درج کریں تاکہ Gemini AI کتاب تیار کر سکے۔
          </p>
        </div>

        {/* Book Title, Author & Genre Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#FBF9F5] p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              کتاب کا عنوان (اختِیاری)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: حکمتِ قلم اور جدید سائنس"
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.authorLabel}
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={t.authorPlaceholder}
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-urdu text-slate-700 mb-1">
              {t.genreLabel}
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as BookGenre)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-urdu bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F172A]"
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
            className={`flex-1 min-w-[130px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
            className={`flex-1 min-w-[130px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
            className={`flex-1 min-w-[130px] px-3 py-2.5 text-xs sm:text-sm font-bold font-urdu rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
              rows={9}
              className="w-full p-4 text-sm font-urdu leading-relaxed bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] resize-y shadow-2xs"
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

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-[#D4AF37] text-xs font-bold font-urdu rounded-lg shadow-2xs">
                <Upload className="w-4 h-4" />
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

        {/* TAB 3: AUDIO UPLOAD & RECORDING */}
        {inputMode === 'audio' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => handleFileUpload(e, 'audio')}
              accept=".mp3,.wav,.m4a,.webm"
              multiple
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Record Option */}
              <div className="border-2 border-slate-200 bg-[#FBF9F5] rounded-xl p-6 text-center flex flex-col justify-between items-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Mic className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-sm font-bold font-urdu text-[#0F172A]">برائے راست آواز ریکارڈ کریں</h4>
                  <p className="text-xs font-urdu text-slate-500 mt-1">مائیکروفون سے بول کر وائس نوٹ شامل کریں</p>
                </div>

                {isRecording ? (
                  <div className="space-y-2 w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-700 font-mono text-xs rounded-full animate-pulse border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>ریکارڈنگ جاری: {formatTimer(recordingSeconds)}</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-urdu rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                      <span>ریکارڈنگ مکمل کریں</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold font-urdu rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>ریکارڈنگ شروع کریں</span>
                  </button>
                )}
              </div>

              {/* Audio File Upload Option */}
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#0F172A] bg-[#FBF9F5] rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-amber-50/30 flex flex-col justify-between items-center space-y-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 text-[#0F172A] flex items-center justify-center group-hover:bg-[#0F172A] group-hover:text-[#D4AF37] transition-colors">
                  <Music className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-sm font-bold font-urdu text-[#0F172A]">آڈیو فائل اپ لوڈ کریں</h4>
                  <p className="text-xs font-urdu text-slate-500 mt-1">MP3, WAV, M4A ریکارڈنگ ڈیوائس سے چنیں</p>
                </div>

                <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F172A] text-[#D4AF37] text-xs font-bold font-urdu rounded-lg shadow-2xs">
                  <Volume2 className="w-4 h-4" />
                  <span>آڈیو فائل منتخب کریں</span>
                </div>
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
                      <Music className="w-4 h-4 text-rose-600 shrink-0" />
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
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="حذف کریں"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Gemini Book Generation Action */}
        <div className="bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-[#D4AF37]/40 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right rtl:text-right ltr:text-left">
              <h3 className="text-base sm:text-lg font-bold font-urdu text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#D4AF37]" />
                <span>کتاب تیار کریں (Build Book with Gemini AI)</span>
              </h3>
              <p className="text-xs font-urdu text-slate-300 mt-0.5">
                AI تمام خام مواد کا تجزیہ کر کے خوبصورت ابواب، فہرست اور مکمل کتاب تشکیل دے گا۔
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isGeneratingBook ? onCancelGeneration : onGenerateBook}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 font-bold font-urdu text-base rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isGeneratingBook
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A]'
                }`}
              >
                {isGeneratingBook ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>کینسل کریں</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5" />
                    <span>کتاب تیار کریں</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Indicator / Progress bar */}
          {isGeneratingBook && generationStatusText && (
            <div className="p-3 bg-slate-900/90 border border-[#D4AF37]/40 rounded-xl text-amber-200 text-xs font-urdu flex items-center justify-between gap-3 animate-fade-in shadow-inner">
              <div className="flex items-center gap-2 overflow-hidden">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37] shrink-0" />
                <span className="truncate">{generationStatusText}</span>
              </div>
            </div>
          )}

          {/* Real Error & Quota Display with Clear Urdu Message & Retry Button */}
          {generationError && (
            <div className={`p-4 sm:p-5 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all ${
              quotaErrorInfo?.isQuotaExhausted
                ? 'bg-amber-950/90 border-[#D4AF37]/60 text-amber-100 shadow-xl'
                : 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-xl'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  quotaErrorInfo?.isQuotaExhausted
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {quotaErrorInfo?.isQuotaExhausted ? (
                    <Clock className="w-5 h-5 text-[#D4AF37]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      quotaErrorInfo?.isQuotaExhausted
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}>
                      {quotaErrorInfo?.isQuotaExhausted
                        ? '⚠️ کوٹہ کی حد (429 RESOURCE_EXHAUSTED)'
                        : '⚠️ سروس الرٹ (Service Alert)'}
                    </span>

                    {quotaErrorInfo?.retryAfterSeconds && quotaErrorInfo.retryAfterSeconds > 0 ? (
                      <span className="text-[11px] font-mono text-[#D4AF37] bg-slate-900 px-2 py-0.5 rounded border border-[#D4AF37]/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>دوبارہ دستیاب ہوگا: {quotaErrorInfo.retryAfterSeconds}s</span>
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs sm:text-sm font-urdu leading-relaxed">
                    {generationError}
                  </p>

                  {/* Quota details explanation */}
                  {quotaErrorInfo?.isQuotaExhausted && (
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] font-urdu text-slate-300 space-y-1.5">
                      <p className="text-[11px] text-amber-200/80">
                        نوٹ: آپ کا درج کردہ تحریری مواد اور منسلکہ فائلیں محفوظ ہیں اور ضائع نہیں ہوئیں۔ آپ نیچے دیے گئے بٹن سے دوبارہ کوشش کر سکتے ہیں۔
                      </p>
                    </div>
                  )}

                  {/* Retry Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => onRetry ? onRetry() : onGenerateBook()}
                      disabled={isGeneratingBook}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#0F172A] font-bold font-urdu text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGeneratingBook ? 'animate-spin' : ''}`} />
                      <span>🔄 دوبارہ کوشش کریں (Retry)</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
