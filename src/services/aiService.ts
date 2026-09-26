import { GeneratedBookData, BookGenre, Language } from '../types';

export interface GenerateBookParams {
  content: string;
  title?: string;
  authorName?: string;
  genre?: BookGenre;
  language?: Language;
}

export interface TitleSuggestion {
  title: string;
  subtitle: string;
}

/**
 * Sends actual user content to Gemini AI backend service to generate a structured book.
 * Validates the returned structure to ensure all required fields (title, chapters, sections, etc.) are valid.
 */
export async function generateBookWithGemini(params: GenerateBookParams): Promise<GeneratedBookData> {
  const { content, title, authorName, genre, language } = params;

  if (!content || !content.trim()) {
    throw new Error('کتاب تیار کرنے کے لیے تحریری مواد فراہم کرنا ضروری ہے۔');
  }

  const response = await fetch('/api/generate-book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: content.trim(),
      title: title?.trim() || undefined,
      authorName: authorName?.trim() || undefined,
      genre: genre || 'general',
      language: language || 'ur',
    }),
  });

  const data = await response.json().catch(() => {
    throw new Error('سرور کی جانب سے نامکمل جواب موصول ہوا۔ براہِ کرم دوبارہ کوشش کریں۔');
  });

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gemini AI سروس کے ساتھ رابطہ قائم نہیں ہو سکا۔');
  }

  const book: GeneratedBookData = data.book;

  // Frontend Response Validation
  if (!book || typeof book !== 'object') {
    throw new Error('Gemini AI کی جانب سے حاصل شدہ ڈیٹا درست فارمیٹ میں نہیں ہے۔');
  }
  if (!book.title || typeof book.title !== 'string') {
    throw new Error('Gemini AI کی جانب سے کتاب کا عنوان تیار نہیں ہو سکا۔');
  }
  if (!Array.isArray(book.chapters) || book.chapters.length === 0) {
    throw new Error('Gemini AI کی جانب سے کتاب کے ابواب تشکیل نہیں پا سکے۔');
  }

  // Validate each chapter
  book.chapters.forEach((chapter, index) => {
    if (!chapter.title || typeof chapter.title !== 'string') {
      chapter.title = `باب ${index + 1}`;
    }
    chapter.subheadings = Array.isArray(chapter.subheadings) ? chapter.subheadings : [];
    chapter.sections = Array.isArray(chapter.sections) ? chapter.sections : [];
  });

  return book;
}

/**
 * Request title suggestions from Gemini AI based on user source content.
 */
export async function suggestTitlesWithGemini(params: {
  content: string;
  genre?: BookGenre;
  language?: Language;
}): Promise<TitleSuggestion[]> {
  const { content, genre, language } = params;

  if (!content || !content.trim()) {
    throw new Error('عنوان کی تجاویز کے لیے پہلے کچھ تحریر درج کریں۔');
  }

  const response = await fetch('/api/suggest-title', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: content.trim(),
      genre: genre || 'general',
      language: language || 'ur',
    }),
  });

  const data = await response.json().catch(() => {
    throw new Error('سرور سے عنوانات کی تجاویز موصول نہیں ہو سکیں۔');
  });

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Gemini AI سے عنوانات تجاویز نہیں ہو سکے۔');
  }

  if (!Array.isArray(data.suggestions)) {
    throw new Error('عنوانات کی تجاویز درست فارمیٹ میں موصول نہیں ہوئیں۔');
  }

  return data.suggestions as TitleSuggestion[];
}
