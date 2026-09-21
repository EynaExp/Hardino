const fa = {
  // Sidebar
  dashboard: 'داشبورد',
  newScan: 'اسکن جدید',
  assets: 'دارایی‌ها',
  settings: 'تنظیمات',
  changePassword: 'تغییر رمز عبور',
  logout: 'خروج',

  // Dashboard
  dashboardTitle: 'داشبورد',
  totalScans: 'کل اسکن‌ها',
  completed: 'تکمیل شده',
  criticalFindings: 'یافته‌های بحرانی',
  highFindings: 'یافته‌های مهم',
  recentScans: 'اسکن‌های اخیر',
  noScans: 'هنوز اسکنی وجود ندارد. روی "اسکن جدید" کلیک کنید.',
  newScanBtn: '+ اسکن جدید',

  // New Scan
  newScanTitle: 'اسکن جدید سخت‌افزاری',
  scanName: 'نام اسکن (اختیاری)',
  targetHost: 'آی‌پی یا هاست‌نام هدف *',
  autoDetectOS: 'تشخیص خودکار سیستم‌عامل',
  sshCredentials: 'اعتبارنامه SSH',
  sshCredsHint: 'اعتبارنامه‌ها فقط برای همین اسکن استفاده شده و هرگز ذخیره نمی‌شوند.',
  sshUsername: 'نام کاربری SSH *',
  sshPort: 'پورت SSH',
  sshPassword: 'رمز عبور SSH',
  sshKeyPath: 'مسیر کلید SSH (اختیاری)',
  aiAnalysis: 'تحلیل هوش مصنوعی',
  aiAnalysisDesc: 'استفاده از LLM برای تحلیل و اولویت‌بندی یافته‌ها',
  aiDisabled: 'گزارش بدون تحلیل LLM تولید می‌شود (سریع‌تر، نیازی به کلید API نیست)',
  startScan: 'شروع اسکن',
  createOnly: 'فقط ایجاد',
  creating: 'در حال ایجاد...',

  // Scan Detail
  findings: 'یافته‌ها',
  phases: 'فازها',
  agentSessions: 'نشست‌های عامل',
  report: 'گزارش',
  searchFindings: 'جستجوی یافته‌ها...',
  sortBySeverity: 'مرتب‌سازی بر اساس شدت',
  sortByCategory: 'مرتب‌سازی بر اساس دسته',
  sortByID: 'مرتب‌سازی بر اساس شناسه',
  noFindings: 'هنوز یافته‌ای وجود ندارد.',
  noFindingsMatch: 'هیچ یافته‌ای با جستجوی شما مطابقت ندارد.',
  remediation: 'رفع مشکل',
  hardeningScore: 'امتیاز سخت‌افزاری',
  checksPassed: 'بررسی‌ها موفق',
  aiAnalysisOff: 'تحلیل AI غیرفعال',
  reportNotAvailable: 'گزارش هنوز در دسترس نیست.',

  // Assets
  assetsTitle: 'دارایی‌ها',
  devices: 'دستگاه',
  searchAssets: 'جستجو بر اساس آی‌پی، هاست‌نام یا سیستم‌عامل...',
  noAssets: 'هیچ دارایی‌ای یافت نشد. یک اسکن اجرا کنید.',
  host: 'هاست',
  os: 'سیستم‌عامل',
  score: 'امتیاز',
  findingsCol: 'یافته‌ها',
  lastScan: 'آخرین اسکن',
  actions: 'عملیات',
  issues: 'مشکل',
  osInfo: 'اطلاعات سیستم‌عامل',
  openPorts: 'پورت‌های باز و سرویس‌ها',
  runningServices: 'سرویس‌های در حال اجرا',
  notes: 'یادداشت‌ها',
  addNotes: 'یادداشت درباره این دارایی...',
  saveNotes: 'ذخیره یادداشت',
  viewLastScan: 'مشاهده آخرین اسکن',

  // Settings
  settingsTitle: 'تنظیمات',
  llmProvider: 'ارائه‌دهنده LLM',
  apiKey: 'کلید API',
  baseUrl: 'آدرس پایه',
  testConnection: 'تست اتصال',
  active: 'فعال',
  failed: 'ناموفق',
  saveSettings: 'ذخیره تنظیمات',
  saved: 'ذخیره شد!',

  // Login
  deviceHardening: 'پلتفرم سخت‌افزاری دستگاه',
  signIn: 'ورود',
  username: 'نام کاربری',
  password: 'رمز عبور',

  // Misc
  loading: 'در حال بارگذاری...',
  unknownTarget: 'هدف ناشناخته',
  created: 'ایجاد شده',
};

export default fa;
