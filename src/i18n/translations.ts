import { Language } from '../types';

export interface TranslationDictionary {
  brandName: string;
  headerTagline: string;
  heroHeading: string;
  heroDescription: string;
  createBookBtn: string;
  
  // How it works
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;
  
  // Workspace
  workspaceTitle: string;
  workspaceSubtitle: string;
  tabText: string;
  tabFile: string;
  tabAudio: string;
  
  textInputPlaceholder: string;
  textInputLabel: string;
  authorLabel: string;
  authorPlaceholder: string;
  genreLabel: string;
  wordCountLabel: string;
  charCountLabel: string;
  
  fileUploadTitle: string;
  fileUploadSubtitle: string;
  fileUploadSupported: string;
  fileSelectBtn: string;
  
  audioUploadTitle: string;
  audioUploadSubtitle: string;
  audioUploadSupported: string;
  audioRecordBtn: string;
  
  phase1Notice: string;
  phase1NoticeDesc: string;
  
  // Title Section
  bookTitleHeading: string;
  bookTitleLabel: string;
  bookTitlePlaceholder: string;
  bookSubtitleLabel: string;
  bookSubtitlePlaceholder: string;
  aiSuggestTitleBtn: string;
  suggestedTitlesHeading: string;
  selectTitlePrompt: string;
  
  // Book Structure Section
  structureHeading: string;
  structureSubtitle: string;
  structureIntro: string;
  structureChapters: string;
  structureHeadings: string;
  structureConclusion: string;
  structureTOC: string;
  targetChaptersLabel: string;
  addChapterBtn: string;
  removeChapterBtn: string;
  subheadingPlaceholder: string;
  
  // Preview Area
  previewHeading: string;
  previewSubtitle: string;
  previewCover: string;
  previewTitlePage: string;
  previewTOC: string;
  previewChapters: string;
  previewConclusion: string;
  prevPage: string;
  nextPage: string;
  zoomIn: string;
  zoomOut: string;
  fullScreen: string;
  exitFullScreen: string;
  pageWordCount: string;
  
  // Final Action Area
  actionHeading: string;
  actionSubtitle: string;
  generateBookBtn: string;
  getPdfBtn: string;
  shareBookBtn: string;
  
  // Modal / Phase Info
  phaseModalTitle: string;
  phaseModalBody: string;
  closeBtn: string;
  
  // Footer
  footerTagline: string;
  footerRights: string;
  footerPhase1Badge: string;
  
  // Genres
  genreAcademic: string;
  genreIslamic: string;
  genreLiterary: string;
  genreSelfHelp: string;
  genreBusiness: string;
  genreMemoir: string;
  genreGeneral: string;
  genreOriginalContent: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  ur: {
    brandName: 'قلم اے آئی',
    headerTagline: 'اپنے خیالات کو ایک مکمل کتاب میں تبدیل کریں',
    heroHeading: 'اپنے خیالات کو ترتیب دیں',
    heroDescription: 'اپنی تحریر، نوٹس، لیکچر، تحقیق یا دوسرے مواد کو Qalam AI کے ذریعے ایک منظم کتاب کی شکل دینے کی طرف پہلا قدم اٹھائیں۔',
    createBookBtn: 'کتاب بنائیں',
    
    howItWorksTitle: 'طریقہ کار',
    howItWorksSubtitle: '',
    step1Title: 'مواد فراہم کریں',
    step1Desc: '',
    step2Title: 'AI سے منظم کریں',
    step2Desc: '',
    step3Title: 'کتاب کا جائزہ لیں',
    step3Desc: '',
    step4Title: 'PDF حاصل کریں',
    step4Desc: '',
    
    workspaceTitle: 'مواد کی فراہمی کا ورک اسپیس',
    workspaceSubtitle: 'اپنی تحریر، نوٹس یا فائلز یہاں شامل کریں تاکہ کتاب کا خاکہ تیار کیا جا سکے',
    tabText: 'اپنی تحریر لکھیں یا Paste کریں',
    tabFile: 'فائل اپ لوڈ کریں (File Upload)',
    tabAudio: 'آڈیو ریکارڈ کریں (Voice / Audio)',
    
    textInputLabel: 'اپنا تحریری مواد یا نوٹس درج کریں',
    textInputPlaceholder: 'یہاں اپنا متن، لیکچر کے نوٹس، مقالہ، یا کتاب کے شروعاتی خیالات پیسٹ کریں...',
    authorLabel: 'مصنف کا نام',
    authorPlaceholder: 'مثلاً: عبد الحفیظ',
    genreLabel: 'کتاب کا موضوع / نوعیت',
    wordCountLabel: 'الفاظ',
    charCountLabel: 'حروف',
    
    fileUploadTitle: 'دستاویزات اپ لوڈ کریں',
    fileUploadSubtitle: 'اپنی موجودہ تحاریر یا نوٹس کی فائلیں یہاں ڈریگ کریں یا منتخب کریں',
    fileUploadSupported: 'کامیاب فارمیٹس: PDF, DOCX, TXT',
    fileSelectBtn: 'فائل منتخب کریں',
    
    audioUploadTitle: 'آڈیو یا وائس نوٹس اپ لوڈ کریں',
    audioUploadSubtitle: 'اپنے ریکارڈ شدہ لیکچرز، آڈیو نوٹس یا وائس ریکارڈنگ شامل کریں',
    audioUploadSupported: 'کامیاب فارمیٹس: MP3, WAV, M4A',
    audioRecordBtn: 'وائس ریکارڈنگ فائل منتخب کریں',
    
    phase1Notice: 'پہلا مرحلہ (Phase 1)',
    phase1NoticeDesc: 'یہ پہلا مرحلہ ہے — مواد منسلک ہونے کے بعد اگلے مرحلے میں AI اسے پروسیس کرے گا۔',
    
    bookTitleHeading: 'کتاب کا عنوان (Book Title)',
    bookTitleLabel: 'کتاب کا عنوان',
    bookTitlePlaceholder: 'مثلاً: حکمتِ قلم اور جدید سائنس',
    bookSubtitleLabel: 'ذیلی عنوان (اختِیاری)',
    bookSubtitlePlaceholder: 'مثلاً: علم سے حقیقی مہارت تک کا سفر',
    aiSuggestTitleBtn: 'AI سے عنوان تجویز کروائیں',
    suggestedTitlesHeading: 'AI کی تجویز کردہ عنوانات',
    selectTitlePrompt: 'پسندیدہ عنوان کا انتخاب کریں یا اپنا تحریر کریں:',
    
    structureHeading: 'کتاب کی ساخت اور خاکہ (Book Structure)',
    structureSubtitle: 'کتاب کے بنیادی اجزاء، فہرست مضامین اور ابواب کی ترتیب',
    structureIntro: 'دیباچہ (Introduction)',
    structureChapters: 'ابواب (Chapters)',
    structureHeadings: 'ذیلی عنوانات (Headings)',
    structureConclusion: 'اختتامیہ (Conclusion)',
    structureTOC: 'فہرستِ مضامین (Table of Contents)',
    targetChaptersLabel: 'مطلوبہ ابواب کی تعداد:',
    addChapterBtn: 'نیا باب شامل کریں',
    removeChapterBtn: 'باب حذف کریں',
    subheadingPlaceholder: 'ذیلی عنوان درج کریں...',
    
    previewHeading: 'کتاب کا لائیو جائزہ (Book Preview)',
    previewSubtitle: 'شائع شدہ کتاب کا حقیقت پسندانہ نظارہ کریں',
    previewCover: 'سرورق (Cover)',
    previewTitlePage: 'عنوان کا صفحہ',
    previewTOC: 'فہرستِ مضامین',
    previewChapters: 'ابواب و متن',
    previewConclusion: 'اختتامیہ',
    prevPage: 'پچھلا صفحہ',
    nextPage: 'اگلا صفحہ',
    zoomIn: 'بڑا کریں (+)',
    zoomOut: 'چھوٹا کریں (-)',
    fullScreen: 'مکمل اسکرین',
    exitFullScreen: 'اسکرین بند کریں',
    pageWordCount: 'صفحہ کے الفاظ',
    
    actionHeading: 'کتاب کی حتمی تیاری (Final Action Area)',
    actionSubtitle: 'اپنی ترتیب شدہ کتاب پر کارروائی کریں',
    generateBookBtn: 'کتاب تیار کریں',
    getPdfBtn: 'PDF حاصل کریں',
    shareBookBtn: 'شیئر کریں',
    
    phaseModalTitle: 'مرحلہ 1 - فاؤنڈیشن کنفرمیشن',
    phaseModalBody: 'آپ کا فارم اور ساخت کامیابی سے مرتب ہو چکی ہے۔ اگلے مرحلے (Phase 2) میں لائیو Gemini AI پروسیسنگ، اسپیچ ٹو ٹیکسٹ اور پی ڈی ایف جنریٹر کو اس پلیٹ فارم سے جوڑا جائے گا۔',
    closeBtn: 'ٹھیک ہے',
    
    footerTagline: 'علم، تحریر اور خیالات کو کتاب کی شکل دینے کا آسان راستہ',
    footerRights: 'جملہ حقوق بحق قلم اے آئی (Qalam AI) محفوظ ہیں۔',
    footerPhase1Badge: 'فیز 1 فاؤنڈیشن ریلیز',
    
    genreAcademic: 'علمی / تحقیقی',
    genreIslamic: 'اسلامی علوم و حکمت',
    genreLiterary: 'ادبی / کہانی',
    genreSelfHelp: 'خود ترقّی و رہنما',
    genreBusiness: 'کاروباری / پیشہ ورانہ',
    genreMemoir: 'سوانح حیات / یادداشتیں',
    genreGeneral: 'عام معلوماتی',
    genreOriginalContent: 'اصل مواد'
  },
  en: {
    brandName: 'Qalam AI',
    headerTagline: 'Turn your thoughts into a complete publication',
    heroHeading: 'Turn your thoughts into a complete book',
    heroDescription: 'Take the first step toward transforming your writing, notes, lectures, research, or content into a beautifully structured book with Qalam AI.',
    createBookBtn: 'Build Book',
    
    howItWorksTitle: 'How It Works',
    howItWorksSubtitle: 'Transform your raw material into a published book in four simple steps',
    step1Title: 'Provide Material',
    step1Desc: 'Write text, upload draft documents, or record voice lectures.',
    step2Title: 'Organize via AI',
    step2Desc: 'AI structures your material into preface, chapters, and headings.',
    step3Title: 'Preview Book',
    step3Desc: 'Inspect live page spreads, table of contents, and cover layout.',
    step4Title: 'Export PDF',
    step4Desc: 'Download your formatted manuscript in print-ready PDF.',
    
    workspaceTitle: 'Book Creation Workspace',
    workspaceSubtitle: 'Add your text, notes, or media files to outline your book manuscript',
    tabText: 'Write or Paste Text',
    tabFile: 'File Upload',
    tabAudio: 'Voice / Audio Upload',
    
    textInputLabel: 'Enter Your Writing or Draft Material',
    textInputPlaceholder: 'Paste your raw text, lecture notes, research papers, or manuscript ideas here...',
    authorLabel: 'Author Name',
    authorPlaceholder: 'e.g. Abdul Hafeez',
    genreLabel: 'Book Genre / Subject',
    wordCountLabel: 'Words',
    charCountLabel: 'Characters',
    
    fileUploadTitle: 'Upload Documents',
    fileUploadSubtitle: 'Drag & drop your draft files or select from device',
    fileUploadSupported: 'Visually supported formats: PDF, DOCX, TXT',
    fileSelectBtn: 'Select File',
    
    audioUploadTitle: 'Upload Audio or Voice Notes',
    audioUploadSubtitle: 'Attach your recorded lectures, dictations, or voice notes',
    audioUploadSupported: 'Visually supported formats: MP3, WAV, M4A',
    audioRecordBtn: 'Select Audio File',
    
    phase1Notice: 'Phase 1 Foundation',
    phase1NoticeDesc: 'This is the first stage — after attaching content, real AI processing connects in the next phase.',
    
    bookTitleHeading: 'Book Title',
    bookTitleLabel: 'Book Title',
    bookTitlePlaceholder: 'e.g. The Architecture of Mind and Modern Science',
    bookSubtitleLabel: 'Book Subtitle (Optional)',
    bookSubtitlePlaceholder: 'e.g. A Journey from Knowledge to True Mastery',
    aiSuggestTitleBtn: 'Suggest Title via AI',
    suggestedTitlesHeading: 'AI Suggested Titles',
    selectTitlePrompt: 'Choose a title candidate or type your custom title:',
    
    structureHeading: 'Book Structure & Outline',
    structureSubtitle: 'Configure preface, chapters, headings, and table of contents',
    structureIntro: 'Introduction / Preface',
    structureChapters: 'Chapters',
    structureHeadings: 'Headings & Subheadings',
    structureConclusion: 'Conclusion',
    structureTOC: 'Table of Contents',
    targetChaptersLabel: 'Target Chapters Count:',
    addChapterBtn: 'Add Chapter',
    removeChapterBtn: 'Remove Chapter',
    subheadingPlaceholder: 'Enter subheading...',
    
    previewHeading: 'Live Book Preview',
    previewSubtitle: 'Examine a realistic publication draft of your upcoming book',
    previewCover: 'Book Cover',
    previewTitlePage: 'Title Page',
    previewTOC: 'Table of Contents',
    previewChapters: 'Chapters & Body',
    previewConclusion: 'Conclusion',
    prevPage: 'Previous Page',
    nextPage: 'Next Page',
    zoomIn: 'Zoom In (+)',
    zoomOut: 'Zoom Out (-)',
    fullScreen: 'Full Screen',
    exitFullScreen: 'Exit Full Screen',
    pageWordCount: 'Page Word Count',
    
    actionHeading: 'Final Action Area',
    actionSubtitle: 'Perform primary actions on your structured manuscript',
    generateBookBtn: 'Build Book',
    getPdfBtn: 'Get PDF',
    shareBookBtn: 'Share Book',
    
    phaseModalTitle: 'Phase 1 - Foundation Ready',
    phaseModalBody: 'Your layout and configuration have been compiled. In Phase 2, live Gemini AI model pipelines, speech-to-text processing, and client-side PDF export will be hooked into these buttons.',
    closeBtn: 'Got it',
    
    footerTagline: 'The effortless gateway from ideas and writing to published books',
    footerRights: 'All rights reserved by Qalam AI.',
    footerPhase1Badge: 'Phase 1 Foundation Release',
    
    genreAcademic: 'Academic / Research',
    genreIslamic: 'Islamic Studies & Philosophy',
    genreLiterary: 'Literary / Fiction',
    genreSelfHelp: 'Self-Help & Leadership',
    genreBusiness: 'Business & Professional',
    genreMemoir: 'Memoir / Biography',
    genreGeneral: 'General Knowledge',
    genreOriginalContent: 'Original Content'
  },
  ar: {
    brandName: 'قلم AI',
    headerTagline: 'حول أفكارك وكتاباتك إلى كتاب كامل',
    heroHeading: 'اپنے خیالات کو ایک مکمل کتاب میں تبدیل کریں',
    heroDescription: 'اتخذ الخطوة الأولى لنقل كتاباتك وملاحظاتك ومحاضراتك وأبحاثك إلى كتاب منظم وأنيق عبر Qalam AI.',
    createBookBtn: 'أنشئ الكتاب',
    
    howItWorksTitle: 'كيف يعمل قلم AI',
    howItWorksSubtitle: 'تحويل موادك الأولية إلى كتاب منشور في 4 خطوات بسيطة',
    step1Title: 'قدم المحتوى',
    step1Desc: 'اكتب النص، ارفع المستندات، أو سجل الملاحظات الصوتية.',
    step2Title: 'التنظيم بالذكاء الاصطناعي',
    step2Desc: 'يقوم الذكاء الاصطناعي بتنظيم محتواك إلى مقدمة، فصول، وعناوين.',
    step3Title: 'معاينة الكتاب',
    step3Desc: 'استعرض صفحات الكتاب وقائمة المحتويات والغلاف مباشرة.',
    step4Title: 'تصدير PDF',
    step4Desc: 'حمل مسودة كتابك بتنسيق طباعي فاخر بصيغة PDF.',
    
    workspaceTitle: 'مساحة إعداد المحتوى',
    workspaceSubtitle: 'أضف نصوصك وملاحظاتك وملفاتك لبناء هيكل كتابك',
    tabText: 'اكتب أو ألصق نصك',
    tabFile: 'رفع الملفات (File Upload)',
    tabAudio: 'رفع التسجيل الصوتي (Voice)',
    
    textInputLabel: 'أدخل نصك أو مسودتك',
    textInputPlaceholder: 'ألصق النص، ملاحظات المحاضرات، أو مسودة كتابك هنا...',
    authorLabel: 'اسم المؤلف',
    authorPlaceholder: 'مثال: عبد الحفيظ',
    genreLabel: 'مجال أو تصنيف الكتاب',
    wordCountLabel: 'الكلمات',
    charCountLabel: 'الحروف',
    
    fileUploadTitle: 'رفع المستندات',
    fileUploadSubtitle: 'اسحب ملفاتك أو اخترها من جهازك',
    fileUploadSupported: 'الصيغ المدعومة بصرية: PDF, DOCX, TXT',
    fileSelectBtn: 'اختر ملفاً',
    
    audioUploadTitle: 'رفع التسجيلات الصوتية',
    audioUploadSubtitle: 'أرفق تسجيلات محاضراتك أو ملاحظاتك الصوتية',
    audioUploadSupported: 'الصيغ المدعومة بصرية: MP3, WAV, M4A',
    audioRecordBtn: 'اختر ملفاً صوتياً',
    
    phase1Notice: 'المرحلة الأولى (Phase 1)',
    phase1NoticeDesc: 'هذه هي المرحلة الأولى — بعد إرفاق المحتوى، سيتم ربط المعالجة بالذكاء الاصطناعي في المرحلة القادمة.',
    
    bookTitleHeading: 'عنوان الكتاب (Book Title)',
    bookTitleLabel: 'عنوان الكتاب',
    bookTitlePlaceholder: 'مثال: معمار الفكر والعلوم الحديثة',
    bookSubtitleLabel: 'العنوان الفرعي (اختياري)',
    bookSubtitlePlaceholder: 'مثال: رحلة من المعرفة إلى الإتقان',
    aiSuggestTitleBtn: 'اقترح عنواناً بالذكاء الاصطناعي',
    suggestedTitlesHeading: 'العناوين المقترحة',
    selectTitlePrompt: 'اختر عنواناً أو اكتب عنوانك الخاص:',
    
    structureHeading: 'هيكل الكتاب ومخططه',
    structureSubtitle: 'تنسيق التمهيد، الفصول، العناوين الفرعية، والخاتمة',
    structureIntro: 'المقدمة / التمهيد',
    structureChapters: 'الفصول (Chapters)',
    structureHeadings: 'العناوين الفرعية',
    structureConclusion: 'الخاتمة',
    structureTOC: 'فهرس المحتويات',
    targetChaptersLabel: 'عدد الفصول المستهدفة:',
    addChapterBtn: 'إضافة فصل جديد',
    removeChapterBtn: 'حذف الفصل',
    subheadingPlaceholder: 'أدخل عنواناً فرعياً...',
    
    previewHeading: 'معاينة الكتاب المباشرة',
    previewSubtitle: 'استعرض مسودة كتابك القادم في بيئة طباعية احترافية',
    previewCover: 'الغلاف',
    previewTitlePage: 'صفحة العنوان',
    previewTOC: 'فهرس المحتويات',
    previewChapters: 'الفصول والنصوص',
    previewConclusion: 'الخاتمة',
    prevPage: 'الصفحة السابقة',
    nextPage: 'الصفحة التالية',
    zoomIn: 'تكبير (+)',
    zoomOut: 'تصغير (-)',
    fullScreen: 'ملء الشاشة',
    exitFullScreen: 'إغلاق ملء الشاشة',
    pageWordCount: 'كلمات الصفحة',
    
    actionHeading: 'إجراءات تجهيز الكتاب',
    actionSubtitle: 'نفذ الإجراءات النهائية على مسودة كتابك',
    generateBookBtn: 'کتاب تیار کریں',
    getPdfBtn: 'PDF حاصل کریں',
    shareBookBtn: 'شیئر کریں',
    
    phaseModalTitle: 'المرحلة الأولى - الأساس جاهز',
    phaseModalBody: 'تم تجهيز الهيكل والمدخلات بنجاح. في المرحلة الثانية سيتم ربط نموذج Gemini AI وتوليد PDF والتسجيل الصوتي المباشر.',
    closeBtn: 'حسناً',
    
    footerTagline: 'الطريق السهل لتحويل الأفكار والكتابات إلى كتب منشورة',
    footerRights: 'جميع الحقوق محفوظة لـ Qalam AI.',
    footerPhase1Badge: 'إصدار المرحلة الأولى',
    
    genreAcademic: 'أكاديمي / بحثي',
    genreIslamic: 'علوم إسلامية',
    genreLiterary: 'أدبي / رواية',
    genreSelfHelp: 'تطوير الذات',
    genreBusiness: 'أعمال ومهني',
    genreMemoir: 'سيرة ذاتية / ذكريات',
    genreGeneral: 'ثقافة عامة',
    genreOriginalContent: 'المحتوى الأصلي'
  }
};
