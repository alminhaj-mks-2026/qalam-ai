export type Language = 'ur' | 'en' | 'ar';

export type InputMode = 'text' | 'file' | 'audio';

export type BookGenre = 'academic' | 'islamic' | 'literary' | 'self_help' | 'business' | 'memoir' | 'general';

export type CoverLayout = 'classic_gold' | 'modern_minimal' | 'royal_islamic' | 'academic_slate' | 'minimal_dark';

export interface CoverPageConfig {
  title: string;
  subtitle: string;
  authorName: string;
  additionalText: string;
  logoUrl?: string;
  layout: CoverLayout;
  alignment: 'center' | 'right' | 'left';
  themeColor: string;
  backgroundColor: string;
  showFrameBorder: boolean;
  showWatermark?: boolean;
  isRtl: boolean;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number; // in bytes
  type: 'pdf' | 'docx' | 'txt' | 'mp3' | 'wav' | 'm4a';
  category: 'document' | 'audio';
  uploadDate: string;
  content?: string;
}

export interface ChapterSection {
  heading: string;
  content: string;
}

export interface ChapterOutline {
  id: string;
  title: string;
  summary?: string;
  subheadings: string[];
  sections?: ChapterSection[];
}

export interface TOCItem {
  title: string;
  sections: string[];
  pageNumber?: number;
}

export interface GeneratedBookData {
  title: string;
  subtitle: string;
  authorName: string;
  language: 'ur' | 'ar' | 'en' | 'mixed';
  introduction: string;
  chapters: ChapterOutline[];
  conclusion: string;
  tableOfContents: TOCItem[];
  generatedAt?: string;
}

export interface BookMetadata {
  title: string;
  subtitle: string;
  authorName: string;
  genre: BookGenre;
  targetChaptersCount: number;
  rawTextContent: string;
  attachedFiles: AttachedFile[];
  prefaceNote: string;
  chapters: ChapterOutline[];
  conclusionNote: string;
  generatedBook?: GeneratedBookData;
  coverConfig?: CoverPageConfig;
}

export interface BookPdfParams {
  title: string;
  subtitle: string;
  authorName: string;
  genre?: string;
  prefaceNote: string;
  conclusionNote: string;
  chapters: ChapterOutline[];
  rawText?: string;
  generatedBook?: GeneratedBookData | null;
  bodyFontSize?: number;
  pageSize?: 'A4' | 'A5' | 'Letter' | 'B5';
  orientation?: 'portrait' | 'landscape';
  autoLayout?: boolean;
  coverConfig?: CoverPageConfig;
  showWatermark?: boolean;
}

export type PreviewPage = 'cover' | 'title_page' | 'toc' | 'conclusion' | string;

export type JobStatus = 'pending' | 'planning' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface BookJobStatusResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
  progressPercent: number;
  currentStage: 'init' | 'searching' | 'outline' | 'chapter' | 'assembling' | 'completed' | 'failed';
  currentChapterIndex?: number;
  totalChapters?: number;
  completedChaptersCount?: number;
  message: string;
  modelUsed?: string;
  error?: string | null;
  quotaErrorInfo?: {
    isQuotaExhausted: boolean;
    retryAfterSeconds: number;
    model: string;
    isDailyLimit?: boolean;
    technicalDetails?: string;
    statusCode?: number;
    errorCode?: string;
  } | null;
  resumed?: boolean;
}

