import React from 'react';

export interface ScriptToken {
  type: 'urdu' | 'arabic' | 'english';
  text: string;
}

/**
 * Checks whether a paragraph is purely or predominantly Arabic.
 * Checks for Arabic Harakat / Tashkeel or common Arabic Qur'an/Hadith formulas
 * and absence of Urdu-only characters (ے, ڈ, ڑ, ں, ٹ, چھ, etc.).
 */
export function isPureArabic(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;

  // Urdu-specific letters
  const hasUrduSpecific = /[ٹڈڑںےہھ]/.test(trimmed);
  if (hasUrduSpecific) return false;

  // Arabic Tashkeel count
  const tashkeelMatches = trimmed.match(/[\u064B-\u065F\u0670]/g);
  const tashkeelCount = tashkeelMatches ? tashkeelMatches.length : 0;

  // If heavy diacritics or Arabic phrase
  if (tashkeelCount >= 2 && !/[a-zA-Z]/.test(trimmed)) {
    return true;
  }

  // Common Arabic formulas
  const arabicFormulas = [
    /صلى\s*الله\s*عليه\s*وسلم/,
    /رضي\s*الله\s*عنه/,
    /رحمه\s*الله/,
    /سبحانه\s*وتعالى/,
    /عز\s*وجل/,
    /بسم\s*الله\s*الرحمن\s*الرحيم/,
    /الحمد\s*لله/,
    /أما\s*بعد/,
  ];

  return arabicFormulas.some((regex) => regex.test(trimmed));
}

/**
 * Checks whether a paragraph is purely or predominantly English / Latin script.
 */
export function isPureEnglish(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Latin letters presence and absence of Arabic/Urdu characters
  const hasLatin = /[a-zA-Z]/.test(trimmed);
  const hasArabicUrdu = /[\u0600-\u06FF\u0750-\u077F]/.test(trimmed);

  return hasLatin && !hasArabicUrdu;
}

/**
 * Tokenizes a mixed string into distinct script chunks:
 * - English phrases & quotes
 * - Arabic quotes with Harakat / Quranic verses
 * - Urdu prose
 */
export function tokenizeScript(text: string): ScriptToken[] {
  if (!text || typeof text !== 'string') return [];

  const tokens: ScriptToken[] = [];

  // Match English words/phrases OR Arabic quotes/verses with diacritics
  const regex = /([A-Za-z][A-Za-z0-9\s,.'"-]*[A-Za-z0-9]|[A-Za-z]+)|([«"][^»"]*[\u064B-\u065F\u0670][^»"]*[»"])|(\b[\u0621-\u064A\u0670]*[\u064B-\u065F\u0670][\u0621-\u064A\u0670\u064B-\u065F\u0670\s]+\b)/gu;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const urduChunk = text.slice(lastIndex, match.index);
      if (urduChunk) {
        tokens.push({ type: 'urdu', text: urduChunk });
      }
    }

    if (match[1]) {
      tokens.push({ type: 'english', text: match[1] });
    } else if (match[2]) {
      tokens.push({ type: 'arabic', text: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'arabic', text: match[3] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailingChunk = text.slice(lastIndex);
    if (trailingChunk) {
      tokens.push({ type: 'urdu', text: trailingChunk });
    }
  }

  return tokens.length > 0 ? tokens : [{ type: 'urdu', text }];
}

/**
 * Formats a block of text into script-aware HTML paragraphs for PDF generation.
 */
export function formatScriptAwareHtml(contentStr: string): string {
  if (!contentStr || typeof contentStr !== 'string') return '';

  const paragraphs = contentStr
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((para) => {
      // 1. Pure English paragraph
      if (isPureEnglish(para)) {
        return `<p class="body-p english-para font-english" dir="ltr">${para}</p>`;
      }

      // 2. Pure Arabic paragraph
      if (isPureArabic(para)) {
        return `<p class="body-p arabic-para font-arabic" dir="rtl">${para}</p>`;
      }

      // 3. Mixed / Urdu paragraph with script-aware inline spans
      const tokens = tokenizeScript(para);
      const innerHtml = tokens
        .map((tok) => {
          if (tok.type === 'english') {
            return `<span class="inline-english font-english" dir="ltr">${tok.text}</span>`;
          }
          if (tok.type === 'arabic') {
            return `<span class="inline-arabic font-arabic" dir="rtl">${tok.text}</span>`;
          }
          return tok.text;
        })
        .join('');

      return `<p class="body-p urdu-para font-urdu" dir="rtl">${innerHtml}</p>`;
    })
    .join('\n');
}

/**
 * Renders script-aware React nodes for interactive Preview in BookPreview.tsx.
 */
export function renderScriptAwareReactParagraphs(
  contentStr: string,
  fontSize: number
): React.ReactNode {
  if (!contentStr || typeof contentStr !== 'string') return null;

  const paragraphs = contentStr
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return null;

  return (
    <div className="book-body-text space-y-3">
      {paragraphs.map((para, pIdx) => {
        // Pure English
        if (isPureEnglish(para)) {
          return (
            <p
              key={pIdx}
              dir="ltr"
              style={{
                fontSize: `${Math.max(13, fontSize - 1)}px`,
                lineHeight: 1.7,
                textAlign: 'justify',
                textAlignLast: 'left',
              }}
              className="text-slate-800 font-english px-1"
            >
              {para}
            </p>
          );
        }

        // Pure Arabic
        if (isPureArabic(para)) {
          return (
            <p
              key={pIdx}
              dir="rtl"
              style={{
                fontSize: `${fontSize + 1}px`,
                lineHeight: 2.1,
                textAlign: 'justify',
                textAlignLast: 'right',
              }}
              className="text-slate-900 font-arabic px-1 bg-amber-50/40 rounded-md py-1 border-r-2 border-[#D4AF37]/50"
            >
              {para}
            </p>
          );
        }

        // Mixed / Standard Urdu
        const tokens = tokenizeScript(para);

        return (
          <p
            key={pIdx}
            dir="rtl"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 2.15,
              textAlign: 'justify',
              textAlignLast: 'right',
            }}
            className="text-slate-800 font-urdu px-1"
          >
            {tokens.map((tok, tIdx) => {
              if (tok.type === 'english') {
                return (
                  <span
                    key={tIdx}
                    dir="ltr"
                    className="inline-block font-english font-medium text-slate-900 px-0.5"
                    style={{ fontSize: `${Math.max(12, fontSize - 2)}px` }}
                  >
                    {tok.text}
                  </span>
                );
              }
              if (tok.type === 'arabic') {
                return (
                  <span
                    key={tIdx}
                    dir="rtl"
                    className="font-arabic text-amber-950 font-bold px-0.5"
                    style={{ fontSize: `${fontSize + 1}px` }}
                  >
                    {tok.text}
                  </span>
                );
              }
              return <React.Fragment key={tIdx}>{tok.text}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}
