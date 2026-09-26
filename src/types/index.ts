export type Language = 'ur' | 'en' | 'ar';

export type InputMode = 'text' | 'file' | 'audio';

export type BookGenre = 'academic' | 'islamic' | 'literary' | 'self_help' | 'business' | 'memoir' | 'general';

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
}

export type PreviewPage = 'cover' | 'title_page' | 'toc' | 'conclusion' | string;
