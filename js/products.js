

/* =========================================================
   products.js — بيانات المتجر + رسومات المنتجات
   كل البيانات هنا تجريبية. في مرحلة لاحقة سنستبدلها
   ببيانات حقيقية قادمة من قاعدة بيانات.
   ========================================================= */

// إعدادات عامة (غيّر العملة من هنا: EGP, SAR, AED, USD ...)
const STORE_CONFIG = {
  name: 'ElectroStore',
  currency: 'EGP',
  locale: 'ar-EG'
};

// الأقسام
const CATEGORIES = [
  { id: 'phones',      label: 'الهواتف',        icon: '📱', desc: 'أحدث الهواتف الذكية' },
  { id: 'headphones',  label: 'السماعات',       icon: '🎧', desc: 'صوت نقي وعزل ممتاز' },
  { id: 'accessories', label: 'الإكسسوارات',    icon: '🔌', desc: 'شواحن وكابلات وأكثر' },
  { id: 'watches',     label: 'الساعات الذكية', icon: '⌚', desc: 'تابع صحتك ووقتك' }
];

/*
  المنتجات (أسماء وعلامات تجارية خيالية).
  - oldPrice: السعر قبل الخصم (اختياري)
  - badge: شارة تظهر على الصورة (اختياري)
  - colors: لونان لتوليد رسم المنتج
  - image: لو وضعت مسار صورة حقيقية (مثل 'images/phone1.jpg') ستظهر بدل الرسم
*/
const PRODUCTS = [
  // ---------- الهواتف ----------
  { id: 1, name: 'هاتف أوريون X5', category: 'phones', price: 14499, oldPrice: 16999, rating: 4.6, reviews: 238,
    badge: 'الأكثر مبيعًا', description: 'شاشة AMOLED بتردد 120Hz وكاميرا ثلاثية 50 ميجابكسل.',
    colors: ['#3b82f6', '#06b6d4'], image: '' },
  { id: 2, name: 'هاتف نوفا برو', category: 'phones', price: 21999, rating: 4.8, reviews: 412,
    badge: 'جديد', description: 'أداء فائق وبطارية تدوم يومين مع شحن سريع.',
    colors: ['#8b5cf6', '#ec4899'], image: '' },
  { id: 3, name: 'هاتف بالس لايت', category: 'phones', price: 5499, oldPrice: 6299, rating: 4.2, reviews: 127,
    description: 'خيار اقتصادي بشاشة كبيرة وبطارية 5000 مللي أمبير.',
    colors: ['#10b981', '#14b8a6'], image: '' },
  { id: 4, name: 'هاتف كرونو ألترا', category: 'phones', price: 27999, rating: 4.9, reviews: 96,
    badge: 'حصري', description: 'كاميرا احترافية بتقريب بصري وشاشة مقاومة للخدش.',
    colors: ['#0f172a', '#6366f1'], image: '' },

  // ---------- السماعات ----------
  { id: 5, name: 'سماعة رأس ساوند ماكس', category: 'headphones', price: 3999, oldPrice: 4599, rating: 4.7, reviews: 311,
    badge: 'خصم', description: 'عزل ضوضاء فعّال وتشغيل متواصل حتى 40 ساعة.',
    colors: ['#1e293b', '#3b82f6'], image: '' },
  { id: 6, name: 'سماعات أذن لاسلكية بودز', category: 'headphones', price: 1299, rating: 4.4, reviews: 540,
    description: 'خفيفة ومريحة مع علبة شحن صغيرة الحجم.',
    colors: ['#f97316', '#f59e0b'], image: '' },
  { id: 7, name: 'سماعة ألعاب فيوري', category: 'headphones', price: 2499, oldPrice: 2899, rating: 4.5, reviews: 203,
    description: 'صوت محيطي وميكروفون واضح لعشاق الألعاب.',
    colors: ['#ef4444', '#be123c'], image: '' },
  { id: 8, name: 'سماعة سلكية كلاسيك', category: 'headphones', price: 799, rating: 4.1, reviews: 88,
    description: 'جودة صوت متوازنة بسعر مناسب للاستخدام اليومي.',
    colors: ['#64748b', '#0ea5e9'], image: '' },

  // ---------- الإكسسوارات ----------
  { id: 9, name: 'شاحن سريع 65 واط', category: 'accessories', price: 599, oldPrice: 749, rating: 4.6, reviews: 372,
    badge: 'خصم', description: 'يشحن هاتفك ولابتوبك بسرعة عبر منفذ USB-C.',
    colors: ['#0ea5e9', '#2563eb'], image: '' },
  { id: 10, name: 'باور بانك 20000 mAh', category: 'accessories', price: 899, rating: 4.5, reviews: 264,
    description: 'سعة كبيرة ومنفذان للشحن في وقت واحد.',
    colors: ['#14b8a6', '#22c55e'], image: '' },
  { id: 11, name: 'كابل USB-C مضفّر', category: 'accessories', price: 249, rating: 4.3, reviews: 451,
    description: 'كابل متين بطول 2 متر يتحمل الثني والاستخدام الشاق.',
    colors: ['#a855f7', '#6366f1'], image: '' },
  { id: 12, name: 'شاحن سيارة مزدوج', category: 'accessories', price: 349, oldPrice: 420, rating: 4.2, reviews: 112,
    description: 'منفذان للشحن السريع أثناء القيادة.',
    colors: ['#f43f5e', '#f97316'], image: '' },

  // ---------- الساعات الذكية ----------
  { id: 13, name: 'ساعة كرونو S2', category: 'watches', price: 3499, oldPrice: 3999, rating: 4.6, reviews: 189,
    badge: 'الأكثر مبيعًا', description: 'شاشة AMOLED وتتبع النوم والنشاط وإشعارات الهاتف.',
    colors: ['#0ea5e9', '#6366f1'], image: '' },
  { id: 14, name: 'ساعة فيت باند', category: 'watches', price: 999, rating: 4.3, reviews: 326,
    description: 'سوار رياضي خفيف مع قياس نبض القلب ومقاومة للماء.',
    colors: ['#22c55e', '#84cc16'], image: '' },
  { id: 15, name: 'ساعة أوريون جولد', category: 'watches', price: 5999, rating: 4.8, reviews: 74,
    badge: 'فاخر', description: 'هيكل معدني أنيق مع GPS وبطارية طويلة المدى.',
    colors: ['#f59e0b', '#b45309'], image: '' },
  { id: 16, name: 'ساعة أطفال كيدو', category: 'watches', price: 1799, oldPrice: 2099, rating: 4.0, reviews: 58,
    description: 'ساعة بألوان مرحة ومتانة عالية للأطفال.',
    colors: ['#ec4899', '#a855f7'], image: '' }
];

/* =========================================================
   createIllustration: ترسم منتجًا بسيطًا (SVG) حسب القسم.
   - uid: معرّف فريد لتجنب تكرار id داخل الصفحة
   ========================================================= */
function createIllustration(category, uid, c1, c2, label) {
  const g = 'g' + uid;   // معرّف التدرج اللوني
  const s = 's' + uid;   // معرّف تدرج الشاشة

  const defs = `
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="${s}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/>
      </linearGradient>
    </defs>
    <circle cx="150" cy="150" r="122" fill="${c1}" opacity=".12"/>
    <circle cx="150" cy="150" r="88" fill="${c2}" opacity=".10"/>`;

  const shapes = {
    phones: `
      <rect x="98" y="46" width="104" height="208" rx="22" fill="url(#${g})"/>
      <rect x="106" y="56" width="88" height="188" rx="15" fill="#0b1220"/>
      <rect x="106" y="56" width="88" height="188" rx="15" fill="url(#${s})" opacity=".55"/>
      <rect x="132" y="63" width="36" height="8" rx="4" fill="#000" opacity=".55"/>
      <circle cx="150" cy="135" r="22" fill="#fff" opacity=".22"/>
      <rect x="120" y="175" width="60" height="8" rx="4" fill="#fff" opacity=".35"/>
      <rect x="130" y="192" width="40" height="8" rx="4" fill="#fff" opacity=".22"/>`,

    headphones: `
      <path d="M80 175 C80 78 220 78 220 175" fill="none" stroke="url(#${g})" stroke-width="15" stroke-linecap="round"/>
      <rect x="62" y="150" width="44" height="82" rx="20" fill="url(#${g})"/>
      <rect x="194" y="150" width="44" height="82" rx="20" fill="url(#${g})"/>
      <rect x="72" y="163" width="14" height="56" rx="7" fill="#0b1220" opacity=".35"/>
      <rect x="214" y="163" width="14" height="56" rx="7" fill="#0b1220" opacity=".35"/>`,

    accessories: `
      <rect x="105" y="82" width="90" height="100" rx="18" fill="url(#${g})"/>
      <rect x="128" y="52" width="10" height="32" rx="3" fill="#cbd5e1"/>
      <rect x="162" y="52" width="10" height="32" rx="3" fill="#cbd5e1"/>
      <path d="M150 182 C150 232 100 218 100 262" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
      <path d="M154 114 L140 134 H150 L145 152 L162 128 H151 Z" fill="#fff" opacity=".9"/>`,

    watches: `
      <rect x="116" y="28" width="68" height="64" rx="14" fill="url(#${g})" opacity=".65"/>
      <rect x="116" y="208" width="68" height="64" rx="14" fill="url(#${g})" opacity=".65"/>
      <rect x="94" y="78" width="112" height="144" rx="34" fill="url(#${g})"/>
      <rect x="103" y="88" width="94" height="124" rx="27" fill="#0b1220"/>
      <circle cx="150" cy="150" r="34" fill="none" stroke="url(#${s})" stroke-width="6"/>
      <path d="M150 150 L150 128 M150 150 L166 158" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <rect x="205" y="128" width="7" height="26" rx="3.5" fill="#cbd5e1"/>`
  };

  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
    ${defs}${shapes[category] || ''}
  </svg>`;
}