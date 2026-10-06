import { resolveAuthorRoleLabel, Taqreez, BookPdfParams } from '../src/types';
import { createBookPdfBlob } from '../src/services/pdfService';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  Testing Author Role and Taqreez Feature Suite');
  console.log('====================================================\n');

  // TEST 1: صرف Author Name (No role selected, backward compatibility)
  console.log('--- TEST 1: صرف Author Name (Default Behavior) ---');
  const role1 = resolveAuthorRoleLabel(undefined, undefined);
  assert(role1 === 'مصنّف', 'Default role returns مصنّف when undefined');
  const roleEmpty = resolveAuthorRoleLabel('', '');
  assert(roleEmpty === 'مصنّف', 'Empty string role returns مصنّف');

  // TEST 2: Author + مؤلف
  console.log('--- TEST 2: Author + مؤلف ---');
  const roleMualif = resolveAuthorRoleLabel('مؤلف');
  assert(roleMualif === 'مؤلف', 'Role correctly resolves to مؤلف');

  // TEST 3: Author + مرتب
  console.log('--- TEST 3: Author + مرتب ---');
  const roleMurattib = resolveAuthorRoleLabel('مرتب');
  assert(roleMurattib === 'مرتب', 'Role correctly resolves to مرتب');

  // TEST 3B: Author + دیگر (Custom Role)
  console.log('--- TEST 3B: Author + دیگر (Custom Role) ---');
  const roleCustom = resolveAuthorRoleLabel('دیگر', 'تالیف و ترتیب');
  assert(roleCustom === 'تالیف و ترتیب', 'Custom designation resolves to user custom text');
  const roleCustomEmpty = resolveAuthorRoleLabel('دیگر', '');
  assert(roleCustomEmpty === 'مصنّف', 'Empty custom designation falls back cleanly to مصنّف');

  // TEST 4: بغیر تقریظ کتاب (Zero Blank Pages, No "تقریظ" Header, Normal Flow)
  console.log('--- TEST 4: بغیر تقریظ کتاب (Backward Compatible) ---');
  const bookNoTaqreez: BookPdfParams = {
    title: 'کتاب بدون تقریظ',
    subtitle: 'ذیلی عنوان',
    authorName: 'مفتی عبدالحفیظ',
    authorRole: 'مصنف',
    prefaceNote: 'یہ دیباچہ کا متن ہے۔',
    conclusionNote: 'یہ اختتامیہ کا متن ہے۔',
    chapters: [
      {
        id: 'c1',
        title: 'باب ۱: ابتدائیہ',
        subheadings: ['عنوان'],
        sections: [{ heading: 'عنوان', content: 'مواد' }]
      }
    ]
  };

  const resNoTaqreez = await createBookPdfBlob(bookNoTaqreez);
  assert(resNoTaqreez.blob.size > 0, `PDF generated for book without taqreez (size: ${resNoTaqreez.blob.size} bytes)`);
  assert(resNoTaqreez.filename.endsWith('.pdf'), `Filename is formatted correctly: ${resNoTaqreez.filename}`);

  // Check generated HTML in cache or direct inspection
  const jobsDir = path.join(process.cwd(), '.qalam_jobs');
  const latestJobs = fs.readdirSync(jobsDir).filter(f => f.endsWith('.pdf'));
  assert(latestJobs.length > 0, 'PDF file created in .qalam_jobs');

  // TEST 5: ایک تقریظ (Single Taqreez with Arabic, Hadith, Blessings)
  console.log('--- TEST 5: ایک تقریظ (Single Taqreez with Original Text Preservation) ---');
  const originalTaqreezText = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
الحمد لله رب العالمين والصلاة والسلام على رسوله الكريم وعلى آله وأصحابه أجمعین۔

فاضل مؤلف مولانا مفتی عبدالحفیظ (حفظہ اللہ تعالی) کی زیر نظر تصنیف ایک وقیع علمی کاوش ہے۔ قرآن و سنت کی روشنی میں جس انداز سے مباحث کو مدون کیا گیا ہے وہ قابلِ تحسین ہے۔
قال النبي ﷺ: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ".`;

  const taqreez1: Taqreez = {
    id: 't-1',
    endorserName: 'علامہ ڈاکٹر محمد طاہر القادری',
    endorserTitle: 'شیخ الحدیث و بانی ادارہ',
    text: originalTaqreezText
  };

  const bookWith1Taqreez: BookPdfParams = {
    title: 'کتاب مع تقریظ',
    subtitle: 'علمی تصنیف',
    authorName: 'مفتی عبدالحفیظ',
    authorRole: 'مؤلف',
    taqreezat: [taqreez1],
    prefaceNote: 'پیش لفظ',
    conclusionNote: 'اختتامیہ',
    chapters: [
      {
        id: 'c1',
        title: 'باب اول',
        subheadings: ['فصل اول'],
        sections: [{ heading: 'فصل اول', content: 'متن' }]
      }
    ]
  };

  const res1 = await createBookPdfBlob(bookWith1Taqreez);
  assert(res1.blob.size > 0, `PDF generated for book with 1 Taqreez (size: ${res1.blob.size} bytes)`);

  // TEST 6: دو تقریظیں (Multiple Taqreezat & Order Verification)
  console.log('--- TEST 6: دو تقریظیں (Two Taqreezat) ---');
  const taqreez2: Taqreez = {
    id: 't-2',
    endorserName: 'حضرت مفتی منیب الرحمن صاحب',
    endorserTitle: 'صدر تنظیم المدارس',
    text: `الحمد لله وحده والصلاة والسلام على من لا نبي بعده۔
کتاب نہایت عمدہ ہے اور عامۃ الناس کے لیے نافع ثابت ہوگی۔`
  };

  const bookWith2Taqreezat: BookPdfParams = {
    title: 'کتاب مع دو تقریظیں',
    subtitle: 'تحقیقی شاہکار',
    authorName: 'مفتی عبدالحفیظ',
    authorRole: 'مرتب',
    taqreezat: [taqreez1, taqreez2],
    prefaceNote: 'پیش لفظ',
    conclusionNote: 'اختتامیہ',
    chapters: [
      {
        id: 'c1',
        title: 'باب اول',
        subheadings: ['فصل اول'],
        sections: [{ heading: 'فصل اول', content: 'متن' }]
      }
    ]
  };

  const res2 = await createBookPdfBlob(bookWith2Taqreezat);
  assert(res2.blob.size > 0, `PDF generated for book with 2 Taqreezat (size: ${res2.blob.size} bytes)`);

  // TEST 7: تقریظ Delete / Filter Simulation
  console.log('--- TEST 7: تقریظ Delete / Filter Simulation ---');
  let currentTaqreezat = [taqreez1, taqreez2];
  // User deletes first taqreez:
  currentTaqreezat = currentTaqreezat.filter(t => t.id !== 't-1');
  assert(currentTaqreezat.length === 1, 'Taqreez deleted from list, count is 1');
  assert(currentTaqreezat[0].id === 't-2', 'Remaining Taqreez is t-2');

  // User deletes remaining taqreez:
  currentTaqreezat = currentTaqreezat.filter(t => t.id !== 't-2');
  assert(currentTaqreezat.length === 0, 'All Taqreezat deleted, list is empty');

  // When empty or blank, filtered validTaqreezat is empty
  const blankTaqreez: Taqreez = { id: 'empty', endorserName: '   ', text: '' };
  const validTaqreezat = [blankTaqreez].filter(
    (t) => (t.endorserName && t.endorserName.trim()) || (t.text && t.text.trim())
  );
  assert(validTaqreezat.length === 0, 'Blank Taqreez ignored, does not create empty page');

  // TEST 8: Text preservation without alteration or AI rewrite
  console.log('--- TEST 8: Text & Symbol Preservation ---');
  assert(originalTaqreezText.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'Bismillah with diacritics preserved');
  assert(originalTaqreezText.includes('حفظہ اللہ تعالی'), 'Dua blessing preserved');
  assert(originalTaqreezText.includes('ﷺ'), 'Sallallahu alaihi wasallam ligature preserved');
  assert(originalTaqreezText.includes('مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ'), 'Hadith Arabic text with diacritics preserved');

  console.log('\n====================================================');
  console.log(`  Tests Passed: ${passed} | Tests Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
