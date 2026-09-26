import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChapterOutline, GeneratedBookData } from '../types';

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
}

/**
 * Escapes special HTML characters to prevent XSS issues when inserting dynamic text.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates structured HTML page cards for offscreen canvas rendering.
 */
function generatePdfPagesHtml(params: BookPdfParams): string {
  const displayTitle = escapeHtml(params.title.trim() || 'کتاب کا عنوان');
  const displaySubtitle = escapeHtml(params.subtitle.trim() || 'یک منظم اور مفصل مطالعہ');
  const displayAuthor = escapeHtml(params.authorName.trim() || 'عبد الحفیظ');
  const displayPreface = escapeHtml(params.prefaceNote.trim());
  const displayConclusion = escapeHtml(params.conclusionNote.trim());

  // Page 1: Cover Page
  let html = `
    <div class="pdf-page-card" style="width:794px; min-height:1123px; box-sizing:border-box; background:#0F172A; color:#F8FAFC; padding:60px 48px; display:flex; flex-direction:column; justify-content:space-between; border:10px solid #D4AF37; position:relative; font-family:'Noto Naskh Arabic', 'Urdu Typesetting', 'Tajawal', system-ui, sans-serif; direction:rtl; text-align:center;">
      <div style="position:absolute; inset:12px; border:1px solid rgba(212, 175, 55, 0.4); pointer-events:none;"></div>
      
      <div style="margin-top:40px;">
        <div style="width:50px; height:50px; margin:0 auto 20px; border-radius:50%; background:rgba(212,175,55,0.15); border:1px solid #D4AF37; display:flex; align-items:center; justify-content:center; color:#D4AF37; font-size:24px;">
          ✒️
        </div>
        <div style="color:#D4AF37; font-size:13px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; margin-bottom:20px;">
          AL-MINHAJ MKS / Qalam AI Edition
        </div>
        <h1 style="font-size:36px; font-weight:bold; color:#FFFFFF; line-height:1.5; margin:0 0 16px 0; padding:0 20px;">
          ${displayTitle}
        </h1>
        <p style="font-size:18px; color:#FDE68A; line-height:1.6; margin:0 auto; max-width:550px;">
          ${displaySubtitle}
        </p>
      </div>

      <div style="margin-bottom:40px; border-top:1px solid rgba(212,175,55,0.3); padding-top:24px;">
        <div style="color:#D4AF37; font-size:12px; letter-spacing:1px; margin-bottom:6px;">مصنّف</div>
        <div style="font-size:22px; font-weight:bold; color:#FFFFFF;">${displayAuthor}</div>
      </div>
    </div>
  `;

  // Page 2: Title & Preface Page
  html += `
    <div class="pdf-page-card" style="width:794px; min-height:1123px; box-sizing:border-box; background:#FBF9F5; color:#0F172A; padding:60px 50px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #CBD5E1; font-family:'Noto Naskh Arabic', 'Urdu Typesetting', 'Tajawal', system-ui, sans-serif; direction:rtl; text-align:right;">
      <div>
        <div style="text-align:center; border-bottom:2px solid #E2E8F0; padding-bottom:24px; margin-bottom:32px;">
          <div style="color:#64748B; font-size:11px; letter-spacing:2px; font-family:monospace; margin-bottom:8px;">AL-MINHAJ MKS PUBLICATION</div>
          <h2 style="font-size:28px; font-weight:bold; color:#0F172A; margin:0 0 8px 0; line-height:1.4;">${displayTitle}</h2>
          <p style="font-size:14px; color:#475569; margin:0;">${displaySubtitle}</p>
          <div style="width:60px; height:3px; background:#D4AF37; margin:16px auto 0;"></div>
          <p style="font-size:14px; color:#334155; margin-top:12px;"><strong>مصنف:</strong> ${displayAuthor}</p>
        </div>

        ${
          displayPreface
            ? `
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:24px; margin-top:20px;">
            <h3 style="font-size:18px; font-weight:bold; color:#78350F; margin:0 0 12px 0; border-bottom:1px solid #FCD34D; padding-bottom:8px;">
              دیباچہ و پیش لفظ:
            </h3>
            <p style="font-size:14px; color:#1E293B; line-height:1.8; margin:0; white-space:pre-line;">
              ${displayPreface}
            </p>
          </div>
        `
            : ''
        }
      </div>

      <div style="text-align:center; font-size:12px; color:#94A3B8; border-top:1px solid #E2E8F0; padding-top:16px;">
        صفحہ ۱ · عنوان و پیش لفظ
      </div>
    </div>
  `;

  // Page 3: Table of Contents
  html += `
    <div class="pdf-page-card" style="width:794px; min-height:1123px; box-sizing:border-box; background:#FBF9F5; color:#0F172A; padding:60px 50px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #CBD5E1; font-family:'Noto Naskh Arabic', 'Urdu Typesetting', 'Tajawal', system-ui, sans-serif; direction:rtl; text-align:right;">
      <div>
        <div style="text-align:center; border-bottom:2px solid #E2E8F0; padding-bottom:16px; margin-bottom:28px;">
          <h2 style="font-size:24px; font-weight:bold; color:#0F172A; margin:0 0 4px 0;">فہرستِ مضامین</h2>
          <p style="font-size:13px; color:#64748B; margin:0;">${displayTitle}</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-bottom:1px dotted #CBD5E1; padding-bottom:8px;">
            <span>دیباچہ و پیش لفظ</span>
            <span style="font-family:monospace; color:#64748B;">صفحہ ۱</span>
          </div>

          ${params.chapters
            .map(
              (chap, idx) => `
            <div style="border-bottom:1px dotted #CBD5E1; padding-bottom:10px;">
              <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; color:#0F172A; margin-bottom:6px;">
                <span>${escapeHtml(chap.title)}</span>
                <span style="font-family:monospace; color:#64748B;">صفحہ ${idx + 2}</span>
              </div>
              ${
                chap.subheadings && chap.subheadings.length > 0
                  ? `
                <div style="padding-right:16px; font-size:12px; color:#475569; display:flex; flex-direction:column; gap:3px;">
                  ${chap.subheadings.map((sub) => `<div>• ${escapeHtml(sub)}</div>`).join('')}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}

          <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-bottom:1px dotted #CBD5E1; padding-bottom:8px; margin-top:8px;">
            <span>اختتامیہ و حاصلِ کلام</span>
            <span style="font-family:monospace; color:#64748B;">صفحہ ${params.chapters.length + 2}</span>
          </div>
        </div>
      </div>

      <div style="text-align:center; font-size:12px; color:#94A3B8; border-top:1px solid #E2E8F0; padding-top:16px;">
        فہرستِ مضامین
      </div>
    </div>
  `;

  // Pages 4+: Chapter Pages
  params.chapters.forEach((chap, idx) => {
    const chapTitle = escapeHtml(chap.title || `باب ${idx + 1}`);
    const chapSummary = escapeHtml(chap.summary || '');
    const hasSections = chap.sections && chap.sections.length > 0;

    html += `
      <div class="pdf-page-card" style="width:794px; min-height:1123px; box-sizing:border-box; background:#FBF9F5; color:#0F172A; padding:60px 50px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #CBD5E1; font-family:'Noto Naskh Arabic', 'Urdu Typesetting', 'Tajawal', system-ui, sans-serif; direction:rtl; text-align:right;">
        <div>
          <div style="border-bottom:2px solid #D4AF37; padding-bottom:12px; margin-bottom:20px;">
            <span style="color:#D4AF37; font-size:12px; font-weight:bold; display:block; margin-bottom:4px;">باب ${idx + 1}</span>
            <h2 style="font-size:22px; font-weight:bold; color:#0F172A; margin:0;">${chapTitle}</h2>
          </div>

          ${
            chapSummary
              ? `
            <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:12px 16px; font-size:13px; color:#78350F; margin-bottom:20px;">
              <strong>خلاصہ: </strong> ${chapSummary}
            </div>
          `
              : ''
          }

          ${
            hasSections
              ? `
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${chap.sections!
                .map(
                  (sec) => `
                <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:16px;">
                  <h4 style="font-size:14px; font-weight:bold; color:#0F172A; background:#F1F5F9; border-right:4px solid #D4AF37; padding:6px 12px; margin:0 0 10px 0; border-radius:4px;">
                    ${escapeHtml(sec.heading)}
                  </h4>
                  <p style="font-size:13px; color:#334155; line-height:1.8; margin:0; white-space:pre-line;">
                    ${escapeHtml(sec.content)}
                  </p>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : `
            <div style="font-size:14px; color:#334155; line-height:1.8; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:20px;">
              ${
                params.rawText
                  ? `<p style="margin:0; white-space:pre-line;">${escapeHtml(params.rawText.slice(idx * 500, (idx + 1) * 500) || params.rawText.slice(0, 500))}</p>`
                  : `<p style="margin:0;">اس باب میں تفصیلی مطالعہ اور علمی نکات پیش کیے گئے ہیں۔</p>`
              }
              ${
                chap.subheadings && chap.subheadings.length > 0
                  ? `
                <div style="margin-top:16px; padding-top:12px; border-top:1px solid #E2E8F0;">
                  <strong style="font-size:13px; color:#0F172A;">ذیلی عنوانات:</strong>
                  <ul style="margin:8px 0 0 0; padding-right:20px; font-size:13px; color:#475569;">
                    ${chap.subheadings.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
                  </ul>
                </div>
              `
                  : ''
              }
            </div>
          `
          }
        </div>

        <div style="text-align:center; font-size:12px; color:#94A3B8; border-top:1px solid #E2E8F0; padding-top:16px;">
          صفحہ ${idx + 2}
        </div>
      </div>
    `;
  });

  // Final Page: Conclusion
  html += `
    <div class="pdf-page-card" style="width:794px; min-height:1123px; box-sizing:border-box; background:#FBF9F5; color:#0F172A; padding:60px 50px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #CBD5E1; font-family:'Noto Naskh Arabic', 'Urdu Typesetting', 'Tajawal', system-ui, sans-serif; direction:rtl; text-align:right;">
      <div>
        <div style="text-align:center; border-bottom:2px solid #E2E8F0; padding-bottom:16px; margin-bottom:28px;">
          <div style="font-size:28px; margin-bottom:8px;">🏆</div>
          <h2 style="font-size:24px; font-weight:bold; color:#0F172A; margin:0 0 4px 0;">اختتامیہ و حاصلِ کلام</h2>
          <p style="font-size:13px; color:#64748B; margin:0;">حاصلِ مطالعہ و سفارشات</p>
        </div>

        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <p style="font-size:14px; color:#1E293B; line-height:1.8; margin:0; white-space:pre-line;">
            ${displayConclusion || 'اس کتاب کے تمام ابواب کا مطالعہ کرنے کے بعد یہ بات واضح ہو جاتی ہے کہ منظم انداز میں پیش کیا گیا مواد قاری کی سوچ میں حقیقی تبدیلی لاتا ہے۔'}
          </p>
        </div>

        <p style="text-align:center; font-size:13px; color:#64748B; margin-top:24px;">
          امید ہے کہ یہ تصنیف آپ کے لیے علمی اور عملی میدان میں مفید ثابت ہوگی۔
        </p>
      </div>

      <div style="text-align:center; font-size:12px; color:#94A3B8; border-top:1px solid #E2E8F0; padding-top:16px;">
        اختتامیہ · AL-MINHAJ MKS Edition
      </div>
    </div>
  `;

  return html;
}

/**
 * Renders the offscreen book elements into a high-fidelity PDF Blob.
 */
export async function createBookPdfBlob(params: BookPdfParams): Promise<{ blob: Blob; filename: string }> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.background = '#0F172A';

  container.innerHTML = generatePdfPagesHtml(params);
  document.body.appendChild(container);

  try {
    // Small delay to allow fonts & layout calculation
    await new Promise((res) => setTimeout(res, 150));

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageCards = container.querySelectorAll<HTMLElement>('.pdf-page-card');

    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i];
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage();
      }

      if (imgHeight <= 297.5) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page slicing for chapters with long contents
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;

        while (heightLeft > 5) {
          position -= 297;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }
      }
    }

    const blob = pdf.output('blob');
    const safeTitle = (params.title || 'Qalam-AI-Book')
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const filename = `${safeTitle || 'Qalam-AI-Book'}.pdf`;

    return { blob, filename };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Triggers direct browser download of the PDF blob.
 */
export function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 10000);
}

/**
 * Shares the PDF as a real file using Web Share API Level 2 (Android/Mobile supported).
 * Falls back to download + notification if file sharing is unsupported on browser/device.
 */
export async function shareBookPdf(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ success: boolean; fallbackTriggered: boolean; message: string }> {
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    !!navigator.canShare &&
    navigator.canShare({ files: [pdfFile] });

  if (canShareFiles) {
    try {
      await navigator.share({
        title: title || 'Qalam AI Book',
        text: `${title || 'Qalam AI Book'} - Qalam AI کے ذریعے مرتب کی گئی کتاب`,
        files: [pdfFile],
      });
      return {
        success: true,
        fallbackTriggered: false,
        message: 'کتاب کامیابی سے شیئر کر دی گئی!',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: true,
          fallbackTriggered: false,
          message: '',
        };
      }
      console.warn('Web Share API error, attempting download fallback:', err);
    }
  }

  // Fallback: Download file directly and alert user
  triggerPdfDownload(blob, filename);
  return {
    success: true,
    fallbackTriggered: true,
    message: 'آپ کے ڈیوائس یا براؤزر پر برائے راست فائل شیئرنگ دستیاب نہیں ہے۔ پی ڈی ایف فائل ڈاؤن لوڈ کر دی گئی ہے تا کہ آپ اسے خود شیئر کر سکیں۔',
  };
}
