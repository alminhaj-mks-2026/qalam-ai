import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { TranslationDictionary } from '../i18n/translations';
import { ChapterOutline, StyleOverrides, CoverPageConfig, CoverLayout, PageImageConfig, Taqreez, resolveAuthorRoleLabel } from '../types';
import {
  Edit3,
  BookOpen,
  Save,
  Layers,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  MoveUp,
  MoveDown,
  Scissors,
  Undo,
  Redo,
  X,
  FileText,
  Palette,
  Sliders,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Book,
  Upload,
  User,
  RotateCcw,
  Clipboard,
  Scroll,
  Plus,
  Trash2
} from 'lucide-react';

export type FieldPath =
  | { type: 'prefaceNote' }
  | { type: 'conclusionNote' }
  | { type: 'chapterTitle'; chIdx: number }
  | { type: 'chapterSummary'; chIdx: number }
  | { type: 'sectionHeading'; chIdx: number; secIdx: number }
  | { type: 'sectionContent'; chIdx: number; secIdx: number };

export function getStyleCss(styles?: StyleOverrides): React.CSSProperties {
  if (!styles) return {};
  const s: React.CSSProperties = {};
  if (styles.fontFamily) {
    s.fontFamily = styles.fontFamily;
  }
  if (styles.fontSize) {
    s.fontSize = `${styles.fontSize}px`;
  }
  if (styles.fontWeight) {
    s.fontWeight = styles.fontWeight;
  }
  if (styles.fontStyle) {
    s.fontStyle = styles.fontStyle;
  }
  if (styles.textDecoration) {
    s.textDecoration = styles.textDecoration;
  }
  if (styles.alignment) {
    s.textAlign = styles.alignment;
  }
  if (styles.spacing !== undefined) {
    s.marginBottom = `${styles.spacing}px`;
  }
  if (styles.positionOffset !== undefined) {
    s.transform = `translateY(${styles.positionOffset}px)`;
  }
  return s;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RTL CARET & SELECTION PRESERVATION ENGINE (SURGICAL FIX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CaretPosition {
  start: number;
  end: number;
  isCollapsed: boolean;
}

export function getCaretCharacterOffset(root: HTMLElement): CaretPosition | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);

  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const start = calculateOffsetFromRoot(root, range.startContainer, range.startOffset);
  const end = range.collapsed
    ? start
    : calculateOffsetFromRoot(root, range.endContainer, range.endOffset);

  return { start, end, isCollapsed: range.collapsed };
}

function countSubtreeChars(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length || 0;
  }
  if (node.nodeName === 'BR') {
    return 1;
  }
  let count = 0;
  for (let i = 0; i < node.childNodes.length; i++) {
    count += countSubtreeChars(node.childNodes[i]);
  }
  return count;
}

function calculateOffsetFromRoot(root: HTMLElement, targetContainer: Node, targetOffset: number): number {
  let charCount = 0;
  let finished = false;

  function traverse(node: Node) {
    if (finished) return;

    if (node === targetContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        charCount += targetOffset;
      } else {
        for (let i = 0; i < targetOffset && i < node.childNodes.length; i++) {
          charCount += countSubtreeChars(node.childNodes[i]);
        }
      }
      finished = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      charCount += node.textContent?.length || 0;
    } else if (node.nodeName === 'BR') {
      charCount += 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
        if (finished) return;
      }
    }
  }

  traverse(root);
  return charCount;
}

function findNodeAtCharOffset(root: HTMLElement, targetOffset: number): { node: Node; offset: number } {
  let charCount = 0;
  let result: { node: Node; offset: number } | null = null;

  function traverse(node: Node): boolean {
    if (result) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length || 0;
      if (charCount + len >= targetOffset) {
        result = {
          node,
          offset: Math.max(0, targetOffset - charCount),
        };
        return true;
      }
      charCount += len;
    } else if (node.nodeName === 'BR') {
      if (charCount + 1 >= targetOffset) {
        if (node.parentNode) {
          const idx = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
          result = {
            node: node.parentNode,
            offset: targetOffset === charCount ? idx : idx + 1,
          };
          return true;
        }
      }
      charCount += 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverse(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  traverse(root);

  if (!result) {
    let lastTextNode: Node | null = null;
    function findLastText(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) lastTextNode = node;
      for (let i = 0; i < node.childNodes.length; i++) {
        findLastText(node.childNodes[i]);
      }
    }
    findLastText(root);

    if (lastTextNode) {
      return { node: lastTextNode, offset: (lastTextNode as Node).textContent?.length || 0 };
    }
    return { node: root, offset: root.childNodes.length };
  }

  return result;
}

export function restoreCaretPosition(root: HTMLElement, caret: CaretPosition): boolean {
  const selection = window.getSelection();
  if (!selection) return false;

  const startPoint = findNodeAtCharOffset(root, caret.start);
  const endPoint = caret.isCollapsed ? startPoint : findNodeAtCharOffset(root, caret.end);

  try {
    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch (err) {
    console.warn('[Qalam AI] Caret restore warning:', err);
    return false;
  }
}

interface RtlEditableFieldProps {
  html: string;
  onChange: (newHtml: string) => void;
  onBlur?: (newHtml: string) => void;
  onFocus?: () => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  'data-placeholder'?: string;
  dir?: 'rtl' | 'ltr';
}

export const RtlEditableField: React.FC<RtlEditableFieldProps> = ({
  html,
  onChange,
  onBlur,
  onFocus,
  style,
  className,
  placeholder,
  'data-placeholder': dataPlaceholder,
  dir = 'rtl',
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(html || '');
  const savedCaretRef = useRef<CaretPosition | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);

  // Sync prop changes from outside (e.g. Undo/Redo or external formatting)
  useLayoutEffect(() => {
    if (!elRef.current) return;
    const currentDomHtml = elRef.current.innerHTML;

    if (html !== lastHtmlRef.current || html !== currentDomHtml) {
      const isFocused = isFocusedRef.current && document.activeElement === elRef.current;

      // Only update if DOM content genuinely diverges from incoming prop
      if (currentDomHtml !== html) {
        if (isFocused) {
          const caret = getCaretCharacterOffset(elRef.current);
          if (caret) savedCaretRef.current = caret;
        }

        elRef.current.innerHTML = html || '';
        lastHtmlRef.current = html || '';

        if (isFocused && savedCaretRef.current) {
          restoreCaretPosition(elRef.current, savedCaretRef.current);
        }
      } else {
        lastHtmlRef.current = html || '';
      }
    }
  }, [html]);

  // Track selection change while this element is active to keep caret position fresh
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!elRef.current || document.activeElement !== elRef.current) return;
      const caret = getCaretCharacterOffset(elRef.current);
      if (caret) {
        savedCaretRef.current = caret;
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!elRef.current) return;
    // Track caret immediately after native DOM mutation
    const caret = getCaretCharacterOffset(elRef.current);
    if (caret) {
      savedCaretRef.current = caret;
    }

    const newHtml = elRef.current.innerHTML;
    lastHtmlRef.current = newHtml;

    if (!isComposingRef.current) {
      onChange(newHtml);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (elRef.current) {
      const caret = getCaretCharacterOffset(elRef.current);
      if (caret) savedCaretRef.current = caret;
    }
    onFocus?.();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (elRef.current) {
      const currentHtml = elRef.current.innerHTML;
      lastHtmlRef.current = currentHtml;
      onBlur?.(currentHtml);
    }
  };

  const handlePointerUp = () => {
    if (!elRef.current) return;
    setTimeout(() => {
      if (elRef.current && document.activeElement === elRef.current) {
        const caret = getCaretCharacterOffset(elRef.current);
        if (caret) savedCaretRef.current = caret;
      }
    }, 10);
  };

  return (
    <div
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      dir={dir}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
      onKeyUp={handlePointerUp}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        if (elRef.current) {
          const newHtml = elRef.current.innerHTML;
          lastHtmlRef.current = newHtml;
          onChange(newHtml);
        }
      }}
      style={{
        direction: 'rtl',
        textAlign: (style?.textAlign as any) || 'right',
        unicodeBidi: 'plaintext',
        outline: 'none',
        ...style,
      }}
      className={className}
      data-placeholder={dataPlaceholder || placeholder}
    />
  );
};

interface BookEditorProps {
  t: TranslationDictionary;
  title: string;
  setTitle: (t: string) => void;
  subtitle: string;
  setSubtitle: (st: string) => void;
  authorName: string;
  setAuthorName: (a: string) => void;
  authorRole?: string;
  setAuthorRole?: (role: string) => void;
  customAuthorRole?: string;
  setCustomAuthorRole?: (role: string) => void;
  prefaceNote: string;
  setPrefaceNote: (p: string) => void;
  conclusionNote: string;
  setConclusionNote: (c: string) => void;
  chapters: ChapterOutline[];
  setChapters: React.Dispatch<React.SetStateAction<ChapterOutline[]>>;
  taqreezat?: Taqreez[];
  setTaqreezat?: React.Dispatch<React.SetStateAction<Taqreez[]>>;
  onDoneEditing: () => void;
  prefaceStyles: StyleOverrides;
  setPrefaceStyles: React.Dispatch<React.SetStateAction<StyleOverrides>>;
  conclusionStyles: StyleOverrides;
  setConclusionStyles: React.Dispatch<React.SetStateAction<StyleOverrides>>;
  pageSize: 'A4' | 'A5' | 'Letter' | 'B5';
  setPageSize: React.Dispatch<React.SetStateAction<'A4' | 'A5' | 'Letter' | 'B5'>>;
  orientation: 'portrait' | 'landscape';
  setOrientation: React.Dispatch<React.SetStateAction<'portrait' | 'landscape'>>;
  autoLayout: boolean;
  setAutoLayout: React.Dispatch<React.SetStateAction<boolean>>;
  bodyFontSize: number;
  setBodyFontSize: React.Dispatch<React.SetStateAction<number>>;
  coverConfig: CoverPageConfig;
  setCoverConfig: React.Dispatch<React.SetStateAction<CoverPageConfig>>;
  prefaceImage: PageImageConfig | undefined;
  setPrefaceImage: React.Dispatch<React.SetStateAction<PageImageConfig | undefined>>;
  conclusionImage: PageImageConfig | undefined;
  setConclusionImage: React.Dispatch<React.SetStateAction<PageImageConfig | undefined>>;
}

export const BookEditor: React.FC<BookEditorProps> = ({
  t,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  authorName,
  setAuthorName,
  authorRole = '',
  setAuthorRole,
  customAuthorRole = '',
  setCustomAuthorRole,
  prefaceNote,
  setPrefaceNote,
  conclusionNote,
  setConclusionNote,
  chapters,
  setChapters,
  taqreezat = [],
  setTaqreezat,
  onDoneEditing,
  prefaceStyles,
  setPrefaceStyles,
  conclusionStyles,
  setConclusionStyles,
  pageSize,
  setPageSize,
  orientation,
  setOrientation,
  autoLayout,
  setAutoLayout,
  bodyFontSize,
  setBodyFontSize,
  coverConfig,
  setCoverConfig,
  prefaceImage,
  setPrefaceImage,
  conclusionImage,
  setConclusionImage,
}) => {
  // Navigation State inside Editor matching actual Pages
  const [editorPage, setEditorPage] = useState<'cover' | 'title_page' | 'toc' | string>('cover');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile virtual keyboard & viewport visibility handler (Targeting exact Caret position)
  useEffect(() => {
    let scrollTimeout: any = null;

    const handleViewportAdjust = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl) return;
        const isEditable = activeEl.hasAttribute('contenteditable') || activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
        if (!isEditable) return;

        // Find the precise Caret / Selection rect if available
        const selection = window.getSelection();
        let targetRect: DOMRect | null = null;
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rects = range.getClientRects();
          if (rects.length > 0) {
            targetRect = rects[0];
          } else {
            targetRect = range.getBoundingClientRect();
          }
        }

        // Fallback to activeEl rect if range rect is zero
        if (!targetRect || (targetRect.width === 0 && targetRect.height === 0)) {
          targetRect = activeEl.getBoundingClientRect();
        }

        const vpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const topMargin = 75; // Clearance for compact sticky toolbar
        const bottomMargin = 70; // Clearance for mobile virtual keyboard

        // Only scroll if caret is truly outside visible safe area
        if (targetRect.top < topMargin) {
          window.scrollBy({
            top: targetRect.top - topMargin - 15,
            behavior: 'smooth',
          });
        } else if (targetRect.bottom > vpHeight - bottomMargin) {
          window.scrollBy({
            top: targetRect.bottom - (vpHeight - bottomMargin) + 20,
            behavior: 'smooth',
          });
        }
      }, 180);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportAdjust);
    }
    document.addEventListener('focusin', handleViewportAdjust);

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportAdjust);
      }
      document.removeEventListener('focusin', handleViewportAdjust);
    };
  }, []);

  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialImageState, setInitialImageState] = useState({ width: 50, xOffset: 0, yOffset: 0 });

  const [isImageSelected, setIsImageSelected] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const imgWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: any) => {
      if (imgWrapperRef.current && !imgWrapperRef.current.contains(e.target as Node)) {
        setIsImageSelected(false);
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentClick);
    };
  }, []);

  const getCurrentImage = (): PageImageConfig | undefined => {
    if (editorPage === 'title_page') {
      return prefaceImage;
    }
    if (editorPage === 'conclusion') {
      return conclusionImage;
    }
    if (editorPage.startsWith('chapter_')) {
      const idx = parseInt(editorPage.replace('chapter_', ''), 10) - 1;
      return chapters[idx]?.chapterImage;
    }
    return undefined;
  };

  const setCurrentImage = (img: PageImageConfig | undefined) => {
    if (editorPage === 'title_page') {
      setPrefaceImage(img);
    } else if (editorPage === 'conclusion') {
      setConclusionImage(img);
    } else if (editorPage.startsWith('chapter_')) {
      const idx = parseInt(editorPage.replace('chapter_', ''), 10) - 1;
      setChapters((prev) => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], chapterImage: img };
        }
        return updated;
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImage: PageImageConfig = {
            url: event.target.result as string,
            sizeType: 'medium',
            width: 50,
            alignment: 'center',
            xOffset: 0,
            yOffset: 0,
            keepAspectRatio: true,
          };
          setCurrentImage(newImage);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Touch helpers
  const getEventCoords = (e: any) => {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  useEffect(() => {
    const handleMove = (e: any) => {
      if (!isResizing && !isDragging) return;
      const coords = getEventCoords(e);
      const imgConfig = getCurrentImage();
      if (!imgConfig) return;

      if (isResizing) {
        const deltaX = coords.clientX - dragStart.x;
        const multiplier = (resizeCorner === 'tl' || resizeCorner === 'bl') ? -1 : 1;
        const newWidth = Math.max(15, Math.min(100, initialImageState.width + multiplier * (deltaX / 5)));
        setCurrentImage({
          ...imgConfig,
          width: Math.round(newWidth),
          sizeType: 'custom'
        });
      } else if (isDragging) {
        const deltaX = coords.clientX - dragStart.x;
        const deltaY = coords.clientY - dragStart.y;
        
        // Drag limit within boundary so image doesn't fly off the screen
        const targetX = Math.round(initialImageState.xOffset + deltaX);
        const targetY = Math.round(initialImageState.yOffset + deltaY);
        const constrainedX = Math.max(-280, Math.min(280, targetX));
        const constrainedY = Math.max(-450, Math.min(450, targetY));

        setCurrentImage({
          ...imgConfig,
          xOffset: constrainedX,
          yOffset: constrainedY
        });
      }
    };

    const handleUp = () => {
      setIsResizing(false);
      setIsDragging(false);
      setResizeCorner(null);
    };

    if (isResizing || isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, isDragging, resizeCorner, dragStart, initialImageState, editorPage, prefaceImage, conclusionImage, chapters]);
  
  // The path of the currently focused input/textarea. Allows Fixed Toolbar to modify its styling.
  const [activeFieldPath, setActiveFieldPath] = useState<FieldPath>({ type: 'prefaceNote' });
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Copy system states & ref
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      setHasSelection(!!(selection && selection.rangeCount > 0 && !selection.isCollapsed && selection.toString().trim()));
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => {
      document.removeEventListener('selectionchange', checkSelection);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Helper to convert HTML to clean plain text
  const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    const formattedHtml = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<div[^>]*>/gi, '');
    tempDiv.innerHTML = formattedHtml;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleCopySelectedText = () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    if (!selectedText) return;

    navigator.clipboard.writeText(selectedText).then(() => {
      showFeedback('کاپی ہو گیا ✓');
    }).catch((err) => {
      console.error('Copy selection failed:', err);
    });
  };

  const handleCopyPreface = () => {
    let text = `--- پیش لفظ ---\n`;
    text += `${htmlToPlainText(prefaceNote)}\n`;

    navigator.clipboard.writeText(text.trim()).then(() => {
      showFeedback('کاپی ہو گیا ✓');
    }).catch((err) => {
      console.error('Copy preface failed:', err);
    });
  };

  const handleCopyConclusion = () => {
    let text = `--- اختتامیہ ---\n`;
    text += `${htmlToPlainText(conclusionNote)}\n`;

    navigator.clipboard.writeText(text.trim()).then(() => {
      showFeedback('کاپی ہو گیا ✓');
    }).catch((err) => {
      console.error('Copy conclusion failed:', err);
    });
  };

  const handleCopyCurrentChapter = () => {
    if (!editorPage.startsWith('chapter_')) return;
    const chapIndex = parseInt(editorPage.replace('chapter_', ''), 10) - 1;
    const chap = chapters[chapIndex];
    if (!chap) return;

    let text = '';
    text += `--- ${chap.title} ---\n`;
    if (chap.summary) text += `خلاصہ: ${chap.summary}\n\n`;

    if (chap.sections && chap.sections.length > 0) {
      chap.sections.forEach((sec) => {
        text += `[${sec.heading}]\n`;
        text += `${htmlToPlainText(sec.content)}\n\n`;
      });
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      showFeedback('کاپی ہو گیا ✓');
    }).catch((err) => {
      console.error('Copy chapter failed:', err);
    });
  };

  const handleCopyFullBook = () => {
    let text = '';
    text += `${title}\n`;
    if (subtitle) text += `${subtitle}\n`;
    text += `مصنف: ${authorName}\n\n`;

    text += `--- پیش لفظ ---\n`;
    text += `${htmlToPlainText(prefaceNote)}\n\n`;

    chapters.forEach((chap) => {
      text += `--- ${chap.title} ---\n`;
      if (chap.summary) text += `خلاصہ: ${chap.summary}\n\n`;
      
      if (chap.sections && chap.sections.length > 0) {
        chap.sections.forEach((sec) => {
          text += `[${sec.heading}]\n`;
          text += `${htmlToPlainText(sec.content)}\n\n`;
        });
      }
    });

    text += `--- اختتامیہ ---\n`;
    text += `${htmlToPlainText(conclusionNote)}\n`;

    navigator.clipboard.writeText(text.trim()).then(() => {
      showFeedback('کاپی ہو گیا ✓');
    }).catch((err) => {
      console.error('Copy full book failed:', err);
    });
  };

  // Snapshot Undo/Redo tracking
  interface EditorSnapshot {
    title: string;
    subtitle: string;
    authorName: string;
    prefaceNote: string;
    conclusionNote: string;
    chapters: ChapterOutline[];
  }

  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const [toolbarError, setToolbarError] = useState<string | null>(null);

  const isRestoringRef = useRef(false);
  const prevStateRef = useRef<EditorSnapshot>({
    title,
    subtitle,
    authorName,
    prefaceNote,
    conclusionNote,
    chapters: JSON.parse(JSON.stringify(chapters))
  });

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    const currentSnapshot: EditorSnapshot = {
      title,
      subtitle,
      authorName,
      prefaceNote,
      conclusionNote,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    // Check if anything actually changed from previous saved state
    const changed = 
      currentSnapshot.title !== prevStateRef.current.title ||
      currentSnapshot.subtitle !== prevStateRef.current.subtitle ||
      currentSnapshot.authorName !== prevStateRef.current.authorName ||
      currentSnapshot.prefaceNote !== prevStateRef.current.prefaceNote ||
      currentSnapshot.conclusionNote !== prevStateRef.current.conclusionNote ||
      JSON.stringify(currentSnapshot.chapters) !== JSON.stringify(prevStateRef.current.chapters);

    if (changed) {
      setHistory((prev) => {
        const updated = [...prev, prevStateRef.current];
        if (updated.length > 100) {
          updated.shift();
        }
        return updated;
      });
      setRedoStack([]);
      prevStateRef.current = currentSnapshot;
    }
  }, [title, subtitle, authorName, prefaceNote, conclusionNote, chapters]);

  const handleUndo = () => {
    if (history.length === 0) return;
    isRestoringRef.current = true;

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    const currentSnapshot: EditorSnapshot = {
      title,
      subtitle,
      authorName,
      prefaceNote,
      conclusionNote,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    setRedoStack((prev) => [...prev, currentSnapshot]);
    setHistory(newHistory);

    setTitle(previous.title);
    setSubtitle(previous.subtitle);
    setAuthorName(previous.authorName);
    setPrefaceNote(previous.prefaceNote);
    setConclusionNote(previous.conclusionNote);
    setChapters(previous.chapters);

    prevStateRef.current = previous;
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    isRestoringRef.current = true;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    const currentSnapshot: EditorSnapshot = {
      title,
      subtitle,
      authorName,
      prefaceNote,
      conclusionNote,
      chapters: JSON.parse(JSON.stringify(chapters))
    };

    setHistory((prev) => [...prev, currentSnapshot]);
    setRedoStack(newRedo);

    setTitle(next.title);
    setSubtitle(next.subtitle);
    setAuthorName(next.authorName);
    setPrefaceNote(next.prefaceNote);
    setConclusionNote(next.conclusionNote);
    setChapters(next.chapters);

    prevStateRef.current = next;
  };

  // Safe rich selection formatter wrapping ranges inside spans to keep selection only formatting
  const applyFormatting = (styleName: keyof StyleOverrides, value: any) => {
    const selection = window.getSelection();
    const hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed;

    if (hasSelection) {
      const range = selection.getRangeAt(0);

      let container: Node | null = range.commonAncestorContainer;
      let isInsideEditor = false;
      while (container) {
        if (container.nodeType === Node.ELEMENT_NODE && (container as HTMLElement).hasAttribute('contenteditable')) {
          isInsideEditor = true;
          break;
        }
        container = container.parentNode;
      }

      if (isInsideEditor) {
        setToolbarError(null);

        const span = document.createElement('span');
        if (styleName === 'fontFamily') span.style.fontFamily = value;
        else if (styleName === 'fontSize') span.style.fontSize = `${value}px`;
        else if (styleName === 'fontWeight') span.style.fontWeight = value;
        else if (styleName === 'fontStyle') span.style.fontStyle = value;
        else if (styleName === 'textDecoration') span.style.textDecoration = value;
        else if (styleName === 'alignment') {
          span.style.display = 'block';
          span.style.textAlign = value;
        }

        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);

          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.addRange(newRange);

          const activeEl = document.activeElement as HTMLElement;
          if (activeEl && activeEl.hasAttribute('contenteditable')) {
            const event = new Event('input', { bubbles: true });
            activeEl.dispatchEvent(event);
          }
          return;
        } catch (e) {
          console.warn('[Qalam AI] Selection formatting issue:', e);
        }
      }
    }

    setToolbarError('براہ کرم پہلے متن منتخب کریں (Please select some text first)');
    setTimeout(() => setToolbarError(null), 5000);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch styles for the target path
  const getStylesForPath = (path: FieldPath): StyleOverrides => {
    switch (path.type) {
      case 'prefaceNote':
        return prefaceStyles || {};
      case 'conclusionNote':
        return conclusionStyles || {};
      case 'chapterTitle':
        return chapters[path.chIdx]?.titleStyles || {};
      case 'chapterSummary':
        return {}; // Summary doesn't have custom styles but inherits default
      case 'sectionHeading':
        return chapters[path.chIdx]?.sections?.[path.secIdx]?.headingStyles || {};
      case 'sectionContent':
        return chapters[path.chIdx]?.sections?.[path.secIdx]?.contentStyles || {};
      default:
        return {};
    }
  };

  // Update styles for the target path
  const updateStylesForPath = (path: FieldPath, newStyles: StyleOverrides) => {
    switch (path.type) {
      case 'prefaceNote':
        setPrefaceStyles((prev) => ({ ...(prev || {}), ...newStyles }));
        break;
      case 'conclusionNote':
        setConclusionStyles((prev) => ({ ...(prev || {}), ...newStyles }));
        break;
      case 'chapterTitle':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          updated[path.chIdx] = {
            ...updated[path.chIdx],
            titleStyles: { ...(updated[path.chIdx].titleStyles || {}), ...newStyles }
          };
          return updated;
        });
        break;
      case 'sectionHeading':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          const chap = { ...updated[path.chIdx] };
          const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
          if (sections[path.secIdx]) {
            sections[path.secIdx] = {
              ...sections[path.secIdx],
              headingStyles: { ...(sections[path.secIdx].headingStyles || {}), ...newStyles }
            };
          }
          chap.sections = sections;
          updated[path.chIdx] = chap;
          return updated;
        });
        break;
      case 'sectionContent':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          const chap = { ...updated[path.chIdx] };
          const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
          if (sections[path.secIdx]) {
            sections[path.secIdx] = {
              ...sections[path.secIdx],
              contentStyles: { ...(sections[path.secIdx].contentStyles || {}), ...newStyles }
            };
          }
          chap.sections = sections;
          updated[path.chIdx] = chap;
          return updated;
        });
        break;
    }
  };

  const handleResetStylesForPath = (path: FieldPath) => {
    switch (path.type) {
      case 'prefaceNote':
        setPrefaceStyles({});
        break;
      case 'conclusionNote':
        setConclusionStyles({});
        break;
      case 'chapterTitle':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          const chap = { ...updated[path.chIdx] };
          delete chap.titleStyles;
          updated[path.chIdx] = chap;
          return updated;
        });
        break;
      case 'sectionHeading':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          const chap = { ...updated[path.chIdx] };
          const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
          if (sections[path.secIdx]) {
            const sec = { ...sections[path.secIdx] };
            delete sec.headingStyles;
            sections[path.secIdx] = sec;
          }
          chap.sections = sections;
          updated[path.chIdx] = chap;
          return updated;
        });
        break;
      case 'sectionContent':
        setChapters((prev) => {
          const updated = [...prev];
          if (!updated[path.chIdx]) return prev;
          const chap = { ...updated[path.chIdx] };
          const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
          if (sections[path.secIdx]) {
            const sec = { ...sections[path.secIdx] };
            delete sec.contentStyles;
            sections[path.secIdx] = sec;
          }
          chap.sections = sections;
          updated[path.chIdx] = chap;
          return updated;
        });
        break;
    }
  };

  const handleUpdateChapterTitle = (index: number, newTitle: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
  };

  const handleUpdateChapterSummary = (index: number, newSummary: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], summary: newSummary };
      return updated;
    });
  };

  const handleUpdateSectionContent = (chapIndex: number, secIndex: number, newContent: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      if (!updated[chapIndex]) return prev;
      const chap = { ...updated[chapIndex] };
      const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
      if (!sections[secIndex]) {
        sections[secIndex] = { heading: `عنوان ${secIndex + 1}`, content: newContent };
      } else {
        sections[secIndex] = { ...sections[secIndex], content: newContent };
      }
      chap.sections = sections;
      updated[chapIndex] = chap;
      return updated;
    });
  };

  const handleUpdateSectionHeading = (chapIndex: number, secIndex: number, newHeading: string) => {
    setChapters((prev) => {
      const updated = [...prev];
      if (!updated[chapIndex]) return prev;
      const chap = { ...updated[chapIndex] };
      const sections = Array.isArray(chap.sections) ? [...chap.sections] : [];
      if (!sections[secIndex]) {
        sections[secIndex] = { heading: newHeading, content: '' };
      } else {
        sections[secIndex] = { ...sections[secIndex], heading: newHeading };
      }
      chap.sections = sections;
      updated[chapIndex] = chap;
      return updated;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverConfig((prev) => ({ ...prev, logoUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toUrduDigits = (num: number): string => {
    const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().split('').map((d) => urduDigits[parseInt(d, 10)] ?? d).join('');
  };

  // Typography Scale Proportional Calculations
  const effectiveFontSize = autoLayout
    ? (pageSize === 'A5' ? 14 : pageSize === 'B5' ? 15 : 16) + (orientation === 'landscape' ? 1 : 0)
    : bodyFontSize;

  const titleFontSize = Math.max(26, Math.round(effectiveFontSize * 1.85));
  const chapterHeadingFontSize = Math.max(20, Math.round(effectiveFontSize * 1.4));
  const sectionHeadingFontSize = Math.max(16, Math.round(effectiveFontSize * 1.25));

  // True A4 geometry sizing classes matching real 210mm x 297mm PDF proportions
  const getContainerSizeClasses = () => {
    if (orientation === 'landscape') {
      if (pageSize === 'A5') return 'w-full max-w-[700px] aspect-[297/210] min-h-[495px]';
      if (pageSize === 'B5') return 'w-full max-w-[850px] aspect-[297/210] min-h-[600px]';
      return 'w-full max-w-[1000px] aspect-[297/210] min-h-[700px]'; // A4
    } else {
      if (pageSize === 'A5') return 'w-full max-w-[500px] aspect-[210/297] min-h-[707px]';
      if (pageSize === 'B5') return 'w-full max-w-[600px] aspect-[210/297] min-h-[848px]';
      return 'w-full max-w-[794px] aspect-[210/297] min-h-[850px] sm:min-h-[1123px]'; // True A4 (210mm x 297mm)
    }
  };

  const isSelectedPath = (path: FieldPath) => {
    if (activeFieldPath.type !== path.type) return false;
    if (path.type === 'chapterTitle' || path.type === 'chapterSummary') {
      return path.chIdx === (activeFieldPath as any).chIdx;
    }
    if (path.type === 'sectionHeading' || path.type === 'sectionContent') {
      return path.chIdx === (activeFieldPath as any).chIdx && path.secIdx === (activeFieldPath as any).secIdx;
    }
    return true;
  };

  // Input Focus Helper: Highlight currently selected field and sync toolbar styling values
  const inputStyleClass = (path: FieldPath) => {
    const base = "w-full transition-all duration-200 bg-transparent rounded-lg border focus:ring-1 focus:ring-[#D4AF37] focus:outline-none placeholder-slate-400 font-urdu";
    return `${base} ${
      isSelectedPath(path)
        ? "border-[#D4AF37] bg-amber-500/5 shadow-inner"
        : "border-transparent hover:border-slate-300/60"
    }`;
  };

  const currentStyles = getStylesForPath(activeFieldPath);

  const renderA4ImageSection = () => {
    if (editorPage === 'cover' || editorPage === 'toc') return null;

    const imgConfig = getCurrentImage();

    if (!imgConfig) {
      return null;
    }

    const imgStyle: React.CSSProperties = {
      width: imgConfig.sizeType === 'custom' ? `${imgConfig.width}%` : 
             imgConfig.sizeType === 'small' ? '25%' :
             imgConfig.sizeType === 'medium' ? '50%' : '75%',
      transform: `translate(${imgConfig.xOffset}px, ${imgConfig.yOffset}px)`,
      aspectRatio: imgConfig.keepAspectRatio ? 'auto' : 'none',
      objectFit: imgConfig.keepAspectRatio ? 'contain' : 'fill',
    };

    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: imgConfig.alignment === 'left' ? 'flex-start' : 
                      imgConfig.alignment === 'right' ? 'flex-end' : 'center',
      width: '100%',
      position: 'relative',
      marginTop: '12px',
      marginBottom: '12px',
    };

    return (
      <div className="mt-4 border-t border-dashed border-slate-200 pt-4" dir="rtl" ref={imgWrapperRef}>
        <div style={wrapperStyle} className="group relative">
          <div 
            className={`relative transition-all rounded-lg overflow-visible ${
              isImageSelected 
                ? 'border-2 border-[#D4AF37] shadow-lg ring-2 ring-[#D4AF37]/20 bg-amber-500/5' 
                : 'border border-transparent hover:border-slate-300/30'
            }`}
            style={{ 
              width: imgStyle.width, 
              transform: imgStyle.transform,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onTouchStart={(e) => {
              const coords = getEventCoords(e);
              setIsDragging(true);
              setIsImageSelected(true);
              setDragStart({ x: coords.clientX, y: coords.clientY });
              setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
            }}
            onMouseDown={(e) => {
              const coords = getEventCoords(e);
              setIsDragging(true);
              setIsImageSelected(true);
              setDragStart({ x: coords.clientX, y: coords.clientY });
              setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
            }}
          >
            <img 
              src={imgConfig.url} 
              alt="Uploaded Page Visual" 
              className="w-full h-auto select-none pointer-events-none rounded-md"
              style={{ aspectRatio: imgStyle.aspectRatio, objectFit: imgStyle.objectFit }}
            />

            {/* Small Delete Button (🗑️) at top-right corner of the image */}
            {isImageSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImage(undefined);
                  setIsImageSelected(false);
                }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer border border-white"
                title="تصویر حذف کریں (Delete Image)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 4 Corner Resize Handles */}
            {isImageSelected && (
              <>
                {/* Top Left */}
                <div 
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#D4AF37] rounded-full shadow-md z-30 cursor-nwse-resize touch-none hover:scale-125 transition-transform"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('tl');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('tl');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                />
                {/* Top Right */}
                <div 
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#D4AF37] rounded-full shadow-md z-30 cursor-nesw-resize touch-none hover:scale-125 transition-transform"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('tr');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('tr');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                />
                {/* Bottom Left */}
                <div 
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#D4AF37] rounded-full shadow-md z-30 cursor-nesw-resize touch-none hover:scale-125 transition-transform"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('bl');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('bl');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                />
                {/* Bottom Right */}
                <div 
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#D4AF37] rounded-full shadow-md z-30 cursor-nwse-resize touch-none hover:scale-125 transition-transform"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('br');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const coords = getEventCoords(e);
                    setIsResizing(true);
                    setResizeCorner('br');
                    setDragStart({ x: coords.clientX, y: coords.clientY });
                    setInitialImageState({ width: imgConfig.width, xOffset: imgConfig.xOffset, yOffset: imgConfig.yOffset });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const validTaqreezat = (taqreezat || []).filter(
    (t) => (t.endorserName && t.endorserName.trim()) || (t.text && t.text.trim())
  );

  // NAVIGATION LIST
  const editorPagesList = [
    { id: 'cover', name: 'سرورق (Cover Page)' },
    ...validTaqreezat.map((tq, idx) => ({
      id: `taqreez_${idx}`,
      name: `تقریظ ${validTaqreezat.length > 1 ? idx + 1 : ''}: ${tq.endorserName ? tq.endorserName.slice(0, 15) : 'اہل علم'}`,
    })),
    { id: 'title_page', name: 'پیش لفظ (Title & Preface)' },
    { id: 'toc', name: 'فہرستِ مضامین (Table of Contents)' },
    ...chapters.map((_, idx) => ({ id: `chapter_${idx + 1}`, name: `باب ${idx + 1}` })),
    { id: 'conclusion', name: 'اختتامیہ (Conclusion)' }
  ];

  return (
    <section id="book-editor" className="py-8 px-4 sm:px-6 bg-[#FAF8F5] border-y border-slate-300">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Editor Info Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#D4AF37] flex items-center justify-center font-bold shadow-md">
              <Edit3 className="w-5 h-5" />
            </div>


          </div>

          <button
            onClick={onDoneEditing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] font-bold font-urdu text-sm rounded-xl shadow-lg transition-all cursor-pointer border border-[#D4AF37]/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ترمیم مکمل کریں اور کتاب دیکھیں</span>
          </button>
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-[#0F172A] text-[#D4AF37] border border-[#D4AF37]/40 px-4 py-2 rounded-xl text-xs font-bold font-urdu shadow-2xl animate-fade-in flex items-center gap-1.5">
            <span>{copyFeedback}</span>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            1. FIXED & COMPACT STICKY QALAM FORMATTING TOOLBAR
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="sticky top-0 z-40 bg-[#0F172A] text-slate-100 border border-[#D4AF37]/50 rounded-xl shadow-xl px-2 sm:px-3 py-1 font-urdu animate-fade-in w-full" dir="rtl">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 w-full justify-start text-xs">
            {/* Real Undo & Redo Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  history.length > 0 ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                  redoStack.length > 0 ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Selector */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('fontFamily', "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', serif")}
                className="px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
              >
                اردو
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('fontFamily', "'Amiri', 'Noto Naskh Arabic', serif")}
                className="px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
              >
                عربی
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('fontFamily', "'Plus Jakarta Sans', system-ui, sans-serif")}
                className="px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Eng
              </button>
            </div>

            {/* Font Size Adjuster */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const s = currentStyles.fontSize || 16;
                  applyFormatting('fontSize', s - 1);
                }}
                className="w-5 h-5 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-200 rounded hover:text-white cursor-pointer font-bold text-xs"
              >
                -
              </button>
              <span className="font-mono text-xs text-[#D4AF37] font-bold min-w-[18px] text-center px-0.5">
                {currentStyles.fontSize || 16}
              </span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const s = currentStyles.fontSize || 16;
                  applyFormatting('fontSize', s + 1);
                }}
                className="w-5 h-5 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-200 rounded hover:text-white cursor-pointer font-bold text-xs"
              >
                +
              </button>
            </div>

            {/* Bold, Italic, Underline */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('fontWeight', 'bold')}
                className="p-1.5 rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('fontStyle', 'italic')}
                className="p-1.5 rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatting('textDecoration', 'underline')}
                className="p-1.5 rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alignments */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              {(['right', 'center', 'left', 'justify'] as const).map((align) => {
                const Icon = align === 'right' ? AlignRight : align === 'center' ? AlignCenter : align === 'left' ? AlignLeft : AlignJustify;
                return (
                  <button
                    key={align}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('alignment', align)}
                    className="p-1.5 rounded-md cursor-pointer text-slate-300 hover:text-white hover:bg-slate-700"
                    title={align}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Action Group: Copy Menu & Image Button */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              {/* Qalam Copy System Dropdown inside toolbar */}
              <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold font-urdu text-[10px] rounded-md transition-all cursor-pointer"
                >
                  <Clipboard className="w-3 h-3 text-[#D4AF37]" />
                  <span>📋 کاپی</span>
                </button>

                {isCopyMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0F172A] border border-[#D4AF37]/30 shadow-xl z-50 py-1.5 text-right font-urdu text-slate-200">
                    <button
                      onClick={() => {
                        handleCopySelectedText();
                        setIsCopyMenuOpen(false);
                      }}
                      disabled={!hasSelection}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors ${
                        hasSelection
                          ? 'text-slate-200 hover:bg-slate-800 hover:text-[#D4AF37] cursor-pointer'
                          : 'text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>📋 منتخب عبارت کاپی کریں</span>
                      {!hasSelection && <span className="text-[9px] text-slate-500 font-normal">(پہلے متن منتخب کریں)</span>}
                    </button>

                    {editorPage.startsWith('chapter_') && (
                      <button
                        onClick={() => {
                          handleCopyCurrentChapter();
                          setIsCopyMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-[#D4AF37] transition-colors cursor-pointer border-t border-slate-800"
                      >
                        <span>📖 موجودہ باب کاپی کریں</span>
                      </button>
                    )}

                    {editorPage === 'title_page' && (
                      <button
                        onClick={() => {
                          handleCopyPreface();
                          setIsCopyMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-[#D4AF37] transition-colors cursor-pointer border-t border-slate-800"
                      >
                        <span>📝 پیش لفظ کاپی کریں</span>
                      </button>
                    )}

                    {editorPage === 'conclusion' && (
                      <button
                        onClick={() => {
                          handleCopyConclusion();
                          setIsCopyMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-[#D4AF37] transition-colors cursor-pointer border-t border-slate-800"
                      >
                        <span>🎓 اختتامیہ کاپی کریں</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleCopyFullBook();
                        setIsCopyMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-[#D4AF37] transition-colors border-t border-slate-800 cursor-pointer"
                    >
                      <span>📚 مکمل کتاب کاپی کریں</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Image button in toolbar */}
              {editorPage !== 'cover' && editorPage !== 'toc' && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold font-urdu text-[10px] rounded-md transition-all cursor-pointer"
                >
                  <span>🖼️ تصویر</span>
                </button>
              )}
            </div>

            {/* Spacing Slider */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700/80 shrink-0">
              <span className="text-slate-300 text-[10px] whitespace-nowrap">فاصلہ:</span>
              <input
                type="range"
                min="0"
                max="60"
                value={currentStyles.spacing !== undefined ? currentStyles.spacing : 12}
                onChange={(e) => updateStylesForPath(activeFieldPath, { spacing: parseInt(e.target.value) })}
                className="w-14 sm:w-20 accent-[#D4AF37] h-1 bg-slate-900 cursor-pointer"
              />
              <span className="text-amber-200 font-mono text-[10px] min-w-[14px] text-right">
                {currentStyles.spacing !== undefined ? currentStyles.spacing : 12}
              </span>
            </div>

            {/* Positional Offsets (Up / Down) */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateStylesForPath(activeFieldPath, { positionOffset: (currentStyles.positionOffset || 0) - 2 })}
                className="px-1.5 py-1 bg-slate-900 rounded text-slate-300 hover:text-white flex items-center gap-0.5 cursor-pointer text-[10px]"
                title="تھوڑا اوپر کریں"
              >
                <MoveUp className="w-3 h-3 text-[#D4AF37]" />
                <span className="hidden sm:inline">اوپر</span>
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateStylesForPath(activeFieldPath, { positionOffset: (currentStyles.positionOffset || 0) + 2 })}
                className="px-1.5 py-1 bg-slate-900 rounded text-slate-300 hover:text-white flex items-center gap-0.5 cursor-pointer text-[10px]"
                title="تھوڑا نیچے کریں"
              >
                <MoveDown className="w-3 h-3 text-[#D4AF37]" />
                <span className="hidden sm:inline">نیچے</span>
              </button>
            </div>

            {/* Page Break Toggle */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateStylesForPath(activeFieldPath, { pageBreakBefore: !currentStyles.pageBreakBefore })}
                className={`p-1.5 rounded-md transition-all cursor-pointer shrink-0 ${
                  currentStyles.pageBreakBefore
                    ? 'bg-amber-500 text-[#0F172A] shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="صفحہ بریک (Page Break)"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reset Styles */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleResetStylesForPath(activeFieldPath)}
                className="p-1.5 text-rose-300 hover:text-rose-200 rounded-md cursor-pointer transition-colors"
                title="فارمیٹنگ ری سیٹ کریں"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Real-Time Selection Warning / Feedback */}
            {toolbarError && (
              <div className="text-rose-400 text-[10px] font-bold px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg animate-pulse shrink-0">
                {toolbarError}
              </div>
            )}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            2. HORIZONTAL PAGE SELECTOR / SWITCHER TABS
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0F172A]/5 border border-slate-300/80 rounded-2xl overflow-x-auto scrollbar-thin">
          {editorPagesList.map((pg) => (
            <button
              key={pg.id}
              onClick={() => setEditorPage(pg.id)}
              className={`px-4 py-2 text-xs font-bold font-urdu rounded-xl whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                editorPage === pg.id
                  ? 'bg-[#0F172A] text-[#D4AF37] shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {pg.id === 'cover' && '📘 '}
              {pg.id.startsWith('taqreez_') && '📜 '}
              {pg.id === 'title_page' && '📝 '}
              {pg.id === 'toc' && '📋 '}
              {pg.id.startsWith('chapter_') && '📖 '}
              {pg.id === 'conclusion' && '🎓 '}
              {pg.name}
            </button>
          ))}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            3. TRUE A4 BOOK PAGE CONTAINER (WYSIWYG CANVAS)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex justify-center py-6 px-2 sm:px-4 bg-slate-200/70 border border-slate-300 rounded-2xl min-h-[500px] overflow-x-auto">
          
          {/* Cover Layout Rendering */}
          {editorPage === 'cover' && (
            <div
              style={{ backgroundColor: coverConfig.backgroundColor || '#0F172A' }}
              className={`${getContainerSizeClasses()} text-slate-100 p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-slate-900/40 rounded-sm border-2 border-slate-800 transition-all duration-300`}
            >
              {/* Cover Double Frame */}
              {coverConfig.showFrameBorder !== false && (
                <>
                  <div style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}90` }} className="absolute inset-3 border-2 pointer-events-none rounded-xl" />
                  <div style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}40` }} className="absolute inset-4 sm:inset-5 border pointer-events-none rounded-lg" />
                </>
              )}

              {/* Cover Content Block */}
              <div className="w-full h-full p-4 sm:p-8 flex flex-col justify-between relative z-10 font-urdu">
                
                {/* Logo & Subtitle Block */}
                <div className={`pt-4 space-y-4 ${coverConfig.alignment === 'right' ? 'text-right' : coverConfig.alignment === 'left' ? 'text-left' : 'text-center'}`}>
                  
                  {/* Editable Logo Area */}
                  <div className="flex flex-col items-center justify-center mb-3">
                    {coverConfig.logoUrl ? (
                      <div className="relative group inline-block">
                        <img src={coverConfig.logoUrl} alt="Logo" className="max-h-16 max-w-[120px] object-contain rounded-lg border border-white/20 shadow-sm" />
                        <button
                          onClick={() => setCoverConfig(prev => ({ ...prev, logoUrl: '' }))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 cursor-pointer"
                          title="لوگو ہٹائیں"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
                        <Upload className="w-5 h-5 text-slate-300" />
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    )}
                  </div>

                  {coverConfig.showWatermark !== false && (
                    <span style={{ color: coverConfig.themeColor || '#D4AF37' }} className="text-[10px] uppercase tracking-widest block font-bold">
                      {coverConfig.additionalText || 'Qalam AI Edition'}
                    </span>
                  )}

                  {/* Inline Editable Title */}
                  <div className="px-2 mb-2 sm:mb-3">
                    <input
                      type="text"
                      dir="rtl"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="کتاب کا عنوان"
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-white/20 focus:border-b focus:border-[#D4AF37] focus:outline-none text-white font-bold leading-relaxed py-1 font-urdu"
                      style={{ fontSize: `${Math.round(titleFontSize * 0.95)}px`, color: '#FFFFFF' }}
                    />
                  </div>

                  {/* Inline Editable Subtitle */}
                  <div className="px-2 max-w-md mx-auto mt-1.5 sm:mt-2">
                    <input
                      type="text"
                      dir="rtl"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="کتاب کا ذیلی عنوان"
                      className="w-full text-center bg-transparent border-b border-transparent hover:border-white/20 focus:border-b focus:border-[#D4AF37] focus:outline-none leading-relaxed py-1 font-urdu text-xs sm:text-base"
                      style={{ color: `${coverConfig.themeColor || '#D4AF37'}DD` }}
                    />
                  </div>
                </div>

                {/* Center Ornament */}
                <div className="flex items-center justify-center my-4">
                  <svg width="44" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                    <circle cx="32" cy="32" r="28" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1" strokeDasharray="3 3"/>
                    <circle cx="32" cy="32" r="20" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1.2"/>
                    <rect x="23.5" y="23.5" width="17" height="17" transform="rotate(45 32 32)" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1"/>
                    <rect x="23.5" y="23.5" width="17" height="17" stroke={coverConfig.themeColor || '#D4AF37'} strokeWidth="1"/>
                    <circle cx="32" cy="32" r="3.5" fill={coverConfig.themeColor || '#D4AF37'}/>
                  </svg>
                </div>

                {/* Inline Editable Author */}
                <div style={{ borderColor: `${coverConfig.themeColor || '#D4AF37'}40` }} className="text-center pb-2 border-t pt-4">
                  <p style={{ color: coverConfig.themeColor || '#D4AF37' }} className="text-[10px] uppercase tracking-wider mb-1">مصنّف</p>
                  <input
                    type="text"
                    dir="rtl"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="مصنف کا نام"
                    className="w-full text-center bg-transparent border-none text-white focus:outline-none font-bold font-urdu text-sm sm:text-base"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Title & Preface Page Rendering */}
          {editorPage === 'title_page' && (
            <div className={`${getContainerSizeClasses()} bg-white text-slate-900 rounded-sm p-3 sm:p-6 md:p-8 shadow-2xl shadow-slate-900/15 border border-slate-300/80 relative flex flex-col justify-between transition-all`}>
              <div className="w-full h-full border border-[#D4AF37]/80 rounded-sm p-3 sm:p-5 md:p-6 flex flex-col justify-between relative bg-white">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span className="text-[#D4AF37] font-bold">Qalam AI</span>
                  <span className="font-bold text-slate-700">{title}</span>
                  <span>پیش لفظ</span>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto space-y-4 font-urdu text-right" dir="rtl">
                  <div className="text-center space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                    <h2 style={{ fontSize: `${Math.max(20, Math.round(titleFontSize * 0.8))}px` }} className="font-bold text-[#0F172A] leading-relaxed mb-2">
                      {title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600">{subtitle}</p>
                    <p className="text-xs font-bold text-[#0F172A]">{authorName}</p>
                    <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto my-2" />
                  </div>

                  {/* WYSIWYG Editable Preface Note with RTL Caret Preservation */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 font-urdu text-right">
                      پیش لفظ و مقدمہ کی عبارت درج کریں:
                    </label>
                    <RtlEditableField
                      html={prefaceNote}
                      onChange={setPrefaceNote}
                      onBlur={setPrefaceNote}
                      onFocus={() => setActiveFieldPath({ type: 'prefaceNote' })}
                      style={{ minHeight: '240px', overflowY: 'auto', fontSize: `${effectiveFontSize}px`, lineHeight: '2.15', textAlign: 'justify', textJustify: 'inter-word', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', serif", ...getStyleCss(prefaceStyles) }}
                      className={inputStyleClass({ type: 'prefaceNote' }) + " p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"}
                      data-placeholder="پیش لفظ کے خیالات یہاں درج کریں..."
                      dir="rtl"
                    />
                  </div>
                  {renderA4ImageSection()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span>Qalam AI</span>
                  <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    صفحہ {toUrduDigits(1)}
                  </span>
                  <span>عنوان و پیش لفظ</span>
                </div>

              </div>
            </div>
          )}

          {/* Table of Contents Preview/Interactive page */}
          {editorPage === 'toc' && (
            <div className={`${getContainerSizeClasses()} bg-white text-slate-900 rounded-sm p-3 sm:p-6 md:p-8 shadow-2xl shadow-slate-900/15 border border-slate-300/80 relative flex flex-col justify-between transition-all`}>
              <div className="w-full h-full border border-[#D4AF37]/80 rounded-sm p-3 sm:p-5 md:p-6 flex flex-col justify-between relative bg-white">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span className="text-[#D4AF37] font-bold">Qalam AI</span>
                  <span className="font-bold text-slate-700">{title}</span>
                  <span>فہرستِ مضامین</span>
                </div>

                {/* Body Contents List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="text-center border-b border-slate-300 pb-2 mb-4 font-urdu">
                    <h3 style={{ fontSize: `${chapterHeadingFontSize}px` }} className="font-bold text-[#0F172A]">فہرستِ مضامین</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{title}</p>
                  </div>

                  <div className="space-y-3 font-urdu">
                    <div
                      onClick={() => setEditorPage('title_page')}
                      className="flex items-center justify-between font-bold text-slate-800 py-1 cursor-pointer hover:text-[#D4AF37] transition-all"
                    >
                      <span>دیباچہ و پیش لفظ</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                      <span className="text-slate-600 text-xs">صفحہ {toUrduDigits(1)}</span>
                    </div>

                    {chapters.map((chap, idx) => (
                      <div key={chap.id || idx} className="space-y-1">
                        <div
                          onClick={() => setEditorPage(`chapter_${idx + 1}`)}
                          className="flex items-center justify-between font-bold text-[#0F172A] py-1 cursor-pointer hover:text-[#D4AF37] transition-all"
                        >
                          <span>{chap.title}</span>
                          <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                          <span className="text-slate-600 text-xs">صفحہ {toUrduDigits(idx + 2)}</span>
                        </div>

                        {chap.subheadings && chap.subheadings.length > 0 && (
                          <div className="pr-4 text-slate-500 space-y-0.5 text-[11px]">
                            {chap.subheadings.map((sub, sIdx) => (
                              <div key={sIdx} className="flex justify-between">
                                <span>• {sub}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div
                      onClick={() => setEditorPage('conclusion')}
                      className="flex items-center justify-between font-bold text-slate-800 py-1 pt-2 cursor-pointer hover:text-[#D4AF37] transition-all"
                    >
                      <span>اختتامیہ و حاصلِ کلام</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 mx-2" />
                      <span className="text-slate-600 text-xs">صفحہ {toUrduDigits(chapters.length + 2)}</span>
                    </div>

                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span>Qalam AI</span>
                  <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    صفحہ {toUrduDigits(2)}
                  </span>
                  <span>فهرستِ مضامين</span>
                </div>

              </div>
            </div>
          )}

          {/* Chapter Pages Rendering */}
          {editorPage.startsWith('chapter_') && (() => {
            const chIdx = parseInt(editorPage.replace('chapter_', ''), 10) - 1;
            const chap = chapters[chIdx];
            if (!chap) return null;
            const pageNum = chIdx + 3;

            return (
              <div className={`${getContainerSizeClasses()} bg-white text-slate-900 rounded-sm p-3 sm:p-6 md:p-8 shadow-2xl shadow-slate-900/15 border border-slate-300/80 relative flex flex-col justify-between transition-all`}>
                <div className="w-full h-full border border-[#D4AF37]/80 rounded-sm p-3 sm:p-5 md:p-6 flex flex-col justify-between relative bg-white">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                    <span className="text-[#D4AF37] font-bold">Qalam AI</span>
                    <span className="font-bold text-slate-700">{title}</span>
                    <span>باب {chIdx + 1}</span>
                  </div>

                  {/* Chapter Body Editor */}
                  <div className="flex-1 overflow-y-auto space-y-4 font-urdu text-right" dir="rtl">
                    
                    {/* Chapter Title Input */}
                    <div className="border-b border-slate-300 pb-3 mb-4 text-center">
                      <span className="text-xs font-bold text-[#D4AF37] block mb-1">باب {chIdx + 1}</span>
                      <RtlEditableField
                        html={chap.title}
                        onChange={(val) => handleUpdateChapterTitle(chIdx, val)}
                        onBlur={(val) => handleUpdateChapterTitle(chIdx, val)}
                        onFocus={() => setActiveFieldPath({ type: 'chapterTitle', chIdx })}
                        style={getStyleCss(chap.titleStyles)}
                        className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#D4AF37] focus:outline-none font-bold text-[#0F172A] leading-relaxed py-1"
                        data-placeholder="باب کا عنوان لکھیں..."
                        dir="rtl"
                      />
                    </div>

                    {/* Chapter Summary Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500">خلاصہ باب (Summary):</label>
                      <RtlEditableField
                        html={chap.summary || ''}
                        onChange={(val) => handleUpdateChapterSummary(chIdx, val)}
                        onBlur={(val) => handleUpdateChapterSummary(chIdx, val)}
                        onFocus={() => setActiveFieldPath({ type: 'chapterSummary', chIdx })}
                        className={inputStyleClass({ type: 'chapterSummary', chIdx }) + " p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"}
                        data-placeholder="اس باب کا خلاصہ یہاں درج کریں..."
                        style={{ minHeight: '60px', overflowY: 'auto', fontSize: `${Math.max(12, effectiveFontSize - 2)}px` }}
                        dir="rtl"
                      />
                    </div>

                    {/* Chapter Sections Editable List */}
                    <div className="space-y-4">
                      {chap.sections && chap.sections.length > 0 ? (
                        chap.sections.map((sec, secIdx) => (
                          <div key={secIdx} className="space-y-3 sm:space-y-4 border-b border-slate-200/80 pb-4 mb-2 last:border-b-0 last:pb-0">
                            
                            {/* Section Heading Input */}
                            <RtlEditableField
                              html={sec.heading}
                              onChange={(val) => handleUpdateSectionHeading(chIdx, secIdx, val)}
                              onBlur={(val) => handleUpdateSectionHeading(chIdx, secIdx, val)}
                              onFocus={() => setActiveFieldPath({ type: 'sectionHeading', chIdx, secIdx })}
                              style={getStyleCss(sec.headingStyles)}
                              className="w-full bg-slate-100/90 hover:bg-slate-200/50 px-3.5 py-2 rounded-lg border-r-4 rtl:border-r-4 border-[#D4AF37] font-bold text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] mb-2 sm:mb-3 leading-relaxed"
                              data-placeholder="ذیلی عنوان لکھیں..."
                              dir="rtl"
                            />

                            {/* Section Content Textarea */}
                            <RtlEditableField
                              html={sec.content}
                              onChange={(val) => handleUpdateSectionContent(chIdx, secIdx, val)}
                              onBlur={(val) => handleUpdateSectionContent(chIdx, secIdx, val)}
                              onFocus={() => setActiveFieldPath({ type: 'sectionContent', chIdx, secIdx })}
                              style={{ minHeight: '160px', overflowY: 'auto', fontSize: `${effectiveFontSize}px`, lineHeight: '2.15', textAlign: 'justify', textJustify: 'inter-word', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', serif", ...getStyleCss(sec.contentStyles) }}
                              className={inputStyleClass({ type: 'sectionContent', chIdx, secIdx }) + " p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"}
                              data-placeholder="سیکشن کا تفصیلی متن یہاں درج کریں..."
                              dir="rtl"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center border text-slate-500 italic">
                          اس باب میں ترمیم کے لیے کوئی ذیلی سیکشن دستیاب نہیں ہے۔
                        </div>
                      )}
                    </div>
                    {renderA4ImageSection()}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                    <span>Qalam AI</span>
                    <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                      صفحہ {toUrduDigits(pageNum)}
                    </span>
                    <span>{title}</span>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* Conclusion Page Rendering */}
          {editorPage === 'conclusion' && (
            <div className={`${getContainerSizeClasses()} bg-white text-slate-900 rounded-sm p-3 sm:p-6 md:p-8 shadow-2xl shadow-slate-900/15 border border-slate-300/80 relative flex flex-col justify-between transition-all`}>
              <div className="w-full h-full border border-[#D4AF37]/80 rounded-sm p-3 sm:p-5 md:p-6 flex flex-col justify-between relative bg-white">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span className="text-[#D4AF37] font-bold">Qalam AI</span>
                  <span className="font-bold text-slate-700">{title}</span>
                  <span>اختتامیہ</span>
                </div>

                {/* Conclusion Body */}
                <div className="flex-1 overflow-y-auto space-y-4 font-urdu text-right" dir="rtl">
                  <div className="text-center pb-3 mb-4 border-b border-slate-300">
                    <h3 style={{ fontSize: `${chapterHeadingFontSize}px` }} className="font-bold text-[#0F172A] leading-relaxed">اختتامیہ و حاصلِ کلام</h3>
                    <p className="text-xs text-slate-500 mt-1">خلاصہ اور سفارشات</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">کتاب کی اختتامی تحریر یہاں ایڈٹ کریں:</label>
                    <RtlEditableField
                      html={conclusionNote}
                      onChange={setConclusionNote}
                      onBlur={setConclusionNote}
                      onFocus={() => setActiveFieldPath({ type: 'conclusionNote' })}
                      style={{ minHeight: '240px', overflowY: 'auto', fontSize: `${effectiveFontSize}px`, lineHeight: '2.15', textAlign: 'justify', textJustify: 'inter-word', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Amiri', serif", ...getStyleCss(conclusionStyles) }}
                      className={inputStyleClass({ type: 'conclusionNote' }) + " p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4AF37] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"}
                      data-placeholder="اختتامی کلمات درج کریں..."
                      dir="rtl"
                    />
                  </div>
                  {renderA4ImageSection()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-3 text-[10px] sm:text-xs text-slate-500 font-urdu">
                  <span>Qalam AI</span>
                  <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    صفحہ {toUrduDigits(chapters.length + 3)}
                  </span>
                  <span>اختتامیہ · ختم شد</span>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Bottom Save Action */}
        <div className="text-center pt-3">
          <button
            onClick={onDoneEditing}
            className="inline-flex items-center gap-2.5 px-10 py-4 bg-[#0F172A] hover:bg-slate-800 text-[#D4AF37] font-bold font-urdu text-base rounded-xl shadow-xl transition-all transform active:scale-95 cursor-pointer border border-[#D4AF37]/40"
          >
            <Save className="w-5 h-5" />
            <span>ترمیم محفوظ کریں اور فائنل کتاب دیکھیں</span>
          </button>
        </div>

        {/* Global Hidden File Input for Image Uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

      </div>
    </section>
  );
};
