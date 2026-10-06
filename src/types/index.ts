export type Language = 'ur' | 'en' | 'ar';

export type InputMode = 'text' | 'file' | 'audio';

export type BookGenre = 'academic' | 'islamic' | 'literary' | 'self_help' | 'business' | 'memoir' | 'general' | 'original_content';

export type CoverLayout = 'classic_gold' | 'modern_minimal' | 'royal_islamic' | 'academic_slate' | 'minimal_dark';

export interface Taqreez {
  id: string;
  endorserName: string;
  endorserTitle?: string;
  text: string;
}

export const AUTHOR_ROLE_OPTIONS = [
  'مصنف',
  'مؤلف',
  'مرتب',
  'مترجم',
  'شارح',
  'محقق',
  'مدوّن',
  'تحقیق و تخریج',
  'تالیف و ترتیب',
  'ترجمہ و تحقیق',
  'دیگر',
] as const;

export type AuthorRoleOption = typeof AUTHOR_ROLE_OPTIONS[number];

export function resolveAuthorRoleLabel(role?: string, customRole?: string): string {
  if (!role || !role.trim()) {
    return 'مصنّف';
  }
  if (role === 'دیگر') {
    return customRole?.trim() || 'مصنّف';
  }
  return role.trim();
}

export interface CoverPageConfig {
  title: string;
  subtitle: string;
  authorName: string;
  authorRole?: string;
  customAuthorRole?: string;
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

export interface StyleOverrides {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'bold' | 'normal' | '';
  fontStyle?: 'italic' | 'normal' | '';
  textDecoration?: 'underline' | 'none' | '';
  alignment?: 'right' | 'center' | 'left' | 'justify';
  spacing?: number; // custom margin/spacing
  positionOffset?: number; // manual up/down adjustment
  pageBreakBefore?: boolean;
}

export interface PageImageConfig {
  url: string; // Base64 data URL
  sizeType: 'small' | 'medium' | 'large' | 'custom';
  width: number; // percentage (e.g. 50)
  height?: number; // percentage or auto
  alignment: 'left' | 'center' | 'right';
  xOffset: number; // in pixels
  yOffset: number; // in pixels
  keepAspectRatio: boolean;
}

export interface ChapterSection {
  heading: string;
  content: string;
  headingStyles?: StyleOverrides;
  contentStyles?: StyleOverrides;
}

export interface ChapterOutline {
  id: string;
  title: string;
  summary?: string;
  subheadings: string[];
  sections?: ChapterSection[];
  titleStyles?: StyleOverrides;
  chapterImage?: PageImageConfig;
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
  authorRole?: string;
  customAuthorRole?: string;
  genre: BookGenre;
  targetChaptersCount: number;
  rawTextContent: string;
  attachedFiles: AttachedFile[];
  prefaceNote: string;
  taqreezat?: Taqreez[];
  chapters: ChapterOutline[];
  conclusionNote: string;
  generatedBook?: GeneratedBookData;
  coverConfig?: CoverPageConfig;
}

export interface BookPdfParams {
  title: string;
  subtitle: string;
  authorName: string;
  authorRole?: string;
  customAuthorRole?: string;
  genre?: string;
  prefaceNote: string;
  taqreezat?: Taqreez[];
  conclusionNote: string;
  chapters: ChapterOutline[];
  prefaceStyles?: StyleOverrides;
  conclusionStyles?: StyleOverrides;
  rawText?: string;
  generatedBook?: GeneratedBookData | null;
  bodyFontSize?: number;
  pageSize?: 'A4' | 'A5' | 'Letter' | 'B5';
  orientation?: 'portrait' | 'landscape';
  autoLayout?: boolean;
  coverConfig?: CoverPageConfig;
  showWatermark?: boolean;
  prefaceImage?: PageImageConfig;
  conclusionImage?: PageImageConfig;
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

