/* =========================================================
   i18n.js — اللغة (ar/en) + الوضع الداكن/الفاتح
   يُحمَّل في <head> قبل أي سكربت آخر ليُطبَّق الاتجاه والمظهر
   قبل أول رسم للصفحة (بدون وميض).
   ========================================================= */
(function () {
  'use strict';

  var LANG_KEY = 'electrostore_lang';
  var THEME_KEY = 'electrostore_theme';

  // value المخزن في قاعدة البيانات = الاسم العربي (ar). en للعرض فقط.
  var GOVERNORATES = [
    { ar: 'القاهرة', en: 'Cairo' }, { ar: 'الجيزة', en: 'Giza' },
    { ar: 'الإسكندرية', en: 'Alexandria' }, { ar: 'الدقهلية', en: 'Dakahlia' },
    { ar: 'البحر الأحمر', en: 'Red Sea' }, { ar: 'البحيرة', en: 'Beheira' },
    { ar: 'الفيوم', en: 'Fayoum' }, { ar: 'الغربية', en: 'Gharbia' },
    { ar: 'الإسماعيلية', en: 'Ismailia' }, { ar: 'المنوفية', en: 'Menoufia' },
    { ar: 'المنيا', en: 'Minya' }, { ar: 'القليوبية', en: 'Qalyubia' },
    { ar: 'الوادي الجديد', en: 'New Valley' }, { ar: 'السويس', en: 'Suez' },
    { ar: 'أسوان', en: 'Aswan' }, { ar: 'أسيوط', en: 'Asyut' },
    { ar: 'بني سويف', en: 'Beni Suef' }, { ar: 'بورسعيد', en: 'Port Said' },
    { ar: 'دمياط', en: 'Damietta' }, { ar: 'الشرقية', en: 'Sharqia' },
    { ar: 'جنوب سيناء', en: 'South Sinai' }, { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
    { ar: 'مطروح', en: 'Matrouh' }, { ar: 'الأقصر', en: 'Luxor' },
    { ar: 'قنا', en: 'Qena' }, { ar: 'شمال سيناء', en: 'North Sinai' },
    { ar: 'سوهاج', en: 'Sohag' }
  ];

  var DICT = {
    ar: {
      'toggle.lang': 'تغيير اللغة', 'toggle.theme': 'تغيير المظهر (داكن/فاتح)',
      'lang.btn': 'EN', 'currency': 'ج.م',
      'cat.phones.label': 'الهواتف', 'cat.phones.desc': 'أحدث الهواتف الذكية',
      'cat.headphones.label': 'السماعات', 'cat.headphones.desc': 'صوت نقي وعزل ممتاز',
      'cat.accessories.label': 'الإكسسوارات', 'cat.accessories.desc': 'شواحن وكابلات وأكثر',
      'cat.watches.label': 'الساعات الذكية', 'cat.watches.desc': 'تابع صحتك ووقتك',
      'status.new': 'جديد', 'status.processing': 'قيد التجهيز', 'status.shipped': 'تم الشحن',
      'status.delivered': 'تم التسليم', 'status.cancelled': 'ملغي',
      'status.pending': 'قيد الانتظار', 'status.confirmed': 'تم التأكيد', 'status.preparing': 'قيد التجهيز',

      /* ---- المتجر ---- */
      'doc.title': 'ElectroStore | متجر الإلكترونيات والإكسسوارات',
      'skip': 'تخطَّ إلى المنتجات',
      'announce': '🚧 هذا المتجر في مرحلة التطوير — الدفع عند الاستلام',
      'logo.aria': 'ElectroStore - الصفحة الرئيسية',
      'menu.open': 'فتح القائمة', 'nav.aria': 'أقسام المتجر',
      'nav.home': 'الرئيسية', 'nav.all': 'كل المنتجات',
      'search.label': 'ابحث عن منتج', 'search.ph': 'ابحث عن هاتف، سماعة، شاحن...', 'search.btn': 'بحث',
      'cart.aria': 'سلة المشتريات',
      'hero.eyebrow': 'عالم التقنية بين يديك', 'hero.h1a': 'تقنية متطورة', 'hero.h1b': 'بتصميم فاخر',
      'hero.p': 'اكتشف تشكيلة من الهواتف والسماعات والساعات الذكية والإكسسوارات، مع تجربة تسوّق سريعة وسهلة على جميع الأجهزة.',
      'hero.shop': 'تسوّق الآن', 'hero.browse': 'تصفّح الأقسام',
      'hero.p1': '✔ تصميم متجاوب', 'hero.p2': '✔ بحث فوري', 'hero.p3': '✔ سلة تفاعلية',
      'cats.title': 'تسوّق حسب القسم', 'cats.sub': 'اختر القسم الذي يناسبك وابدأ التصفّح',
      'prod.title': 'منتجاتنا', 'prod.filter': 'تصفية المنتجات حسب القسم', 'chip.all': 'الكل',
      'sort.label': 'الترتيب:', 'sort.default': 'الافتراضي', 'sort.asc': 'السعر: الأقل أولًا',
      'sort.desc': 'السعر: الأعلى أولًا', 'sort.rating': 'الأعلى تقييمًا',
      'empty.title': 'لا توجد نتائج',
      'empty.text': 'لم نجد منتجات تطابق "{term}". جرّب كلمة أخرى أو اختر قسمًا مختلفًا.',
      'empty.reset': 'عرض كل المنتجات', 'empty.thisCat': 'هذا القسم',
      'footer.about': 'متجر إلكترونيات وإكسسوارات — مشروع قيد التطوير.', 'footer.cats': 'الأقسام',
      'footer.noteTitle': 'ملاحظة', 'footer.note': 'الدفع حاليًا عند الاستلام فقط، والدفع الإلكتروني سيُضاف لاحقًا.',
      'footer.rights': 'ElectroStore — جميع الحقوق محفوظة',
      'cartd.title': 'سلة المشتريات', 'cartd.close': 'إغلاق السلة', 'cartd.empty': 'سلتك فارغة حاليًا',
      'cartd.start': 'ابدأ التسوّق', 'cartd.total': 'الإجمالي', 'cartd.checkout': 'إتمام الشراء',
      'cartd.clear': 'تفريغ السلة', 'cartd.note': 'الدفع عند الاستلام. الشحن يُحسب عند إتمام الطلب.',
      'cartd.qty': 'الكمية', 'cartd.dec': 'تقليل', 'cartd.inc': 'زيادة', 'cartd.remove': 'حذف {name} من السلة',
      'co.title': 'إتمام الطلب', 'co.sub': 'أدخل بيانات التوصيل وسندفع عند الاستلام.', 'co.close': 'إغلاق',
      'co.name': 'الاسم بالكامل *', 'co.phone': 'رقم الموبايل *', 'co.gov': 'المحافظة *',
      'co.govPick': 'اختر المحافظة', 'co.address': 'العنوان بالتفصيل *',
      'co.addressPh': 'المدينة / الحي / الشارع / رقم العمارة / الدور', 'co.notes': 'ملاحظات (اختياري)',
      'co.pay': '💵 طريقة الدفع: الدفع عند الاستلام', 'co.confirm': 'تأكيد الطلب', 'co.sending': 'جارٍ إرسال الطلب...',
      'co.subtotal': 'مجموع المنتجات', 'co.shipping': 'الشحن', 'co.shipPick': 'اختر المحافظة لحساب الشحن',
      'co.total': 'الإجمالي (الدفع عند الاستلام)',
      'co.okTitle': 'تم استلام طلبك',
      'co.okText': 'رقم طلبك #{n} — الإجمالي {total} شامل الشحن (الدفع عند الاستلام). سنتواصل معك على {phone} لتأكيد الطلب.',
      'co.continue': 'متابعة التسوق',
      'v.name': 'اكتب الاسم بالكامل.',
      'v.phone': 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.',
      'v.gov': 'اختر المحافظة.', 'v.address': 'اكتب العنوان بالتفصيل.', 'v.cartEmpty': 'السلة فارغة.',
      'v.noDb': 'تعذر الاتصال بقاعدة البيانات. حدّث الصفحة وحاول مرة أخرى.',
      'v.orderFail': 'تعذر إرسال الطلب. قد يكون منتج نفد من المخزون أو تغيّر — راجع السلة وحاول مرة أخرى.',
      's.noScripts': 'تعذّر تحميل ملفات الموقع (js/products.js أو js/i18n.js) — تأكد من أسماء الملفات ومكانها ثم أعد تحميل الصفحة.',
      's.loading': 'جارٍ تحميل المنتجات...', 's.none': 'لا توجد منتجات حاليًا', 's.noneSub': 'سنضيف منتجات جديدة قريبًا.',
      's.fail': 'تعذّر تحميل المنتجات', 's.failSub': 'تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.', 's.retry': 'إعادة المحاولة',
      's.noLib': 'مكتبة Supabase لم يتم تحميلها.',
      'count.n': '{n} منتجات', 'results': 'عرض {n} منتج',
      'badge.soldout': 'نفد المخزون', 'badge.discount': 'خصم {n}%', 'card.add': '🛒 أضف إلى السلة',
      'stock.available': 'المتاح: {n} قطع', 'stock.out': 'نفد المخزون',
      'toast.unavailable': 'هذا المنتج غير متوفر حاليًا',
      'toast.max': 'أقصى كمية متاحة من "{name}" هي {n}', 'toast.maxShort': 'أقصى كمية متاحة هي {n}',
      'toast.added': 'تمت إضافة "{name}" إلى السلة', 'toast.cleared': 'تم تفريغ السلة', 'toast.empty': 'السلة فارغة',
      'disc': 'خصم {n}%',

      /* ---- المتجر: الخيارات ونافذة المنتج ---- */
      'card.choose': 'اختر الخيارات', 'card.from': 'من',
      'toast.pickOptions': 'اختر كل الخيارات المطلوبة أولًا',
      'pd.close': 'إغلاق', 'pd.prev': 'الصورة السابقة', 'pd.next': 'الصورة التالية', 'pd.slide': 'عرض الصورة {n}',
      'pd.choose': 'اختر...', 'pd.pick': 'اختر: {names}',
      'pd.pickForStock': 'اختر الخيارات لمعرفة المتاح.',
      'pd.unavailableCombo': 'هذه التركيبة غير متوفرة حاليًا.',
      'pd.maxInCart': 'وصلت للحد الأقصى المتاح في سلتك.',

      /* ---- لوحة التحكم ---- */
      'a.title': 'لوحة التحكم | ElectroStore', 'a.header': '⚡ ElectroStore — لوحة التحكم',
      'a.back': 'الرجوع للمتجر ↩', 'a.logout': 'تسجيل الخروج',
      'a.login.title': '🔐 تسجيل دخول الأدمن', 'a.email': 'البريد الإلكتروني', 'a.emailPh': 'أدخل إيميل الأدمن',
      'a.password': 'كلمة المرور', 'a.passwordPh': 'أدخل كلمة المرور', 'a.login': 'تسجيل الدخول',
      'a.loggingIn': 'جارٍ تسجيل الدخول...', 'a.loginFail': 'فشل تسجيل الدخول. راجع الإيميل وكلمة المرور.',
      'a.notAdmin': 'هذا الحساب غير مصرح له بدخول لوحة التحكم.', 'a.loggedOut': 'تم تسجيل الخروج.',
      'a.checkFail': 'تعذر التحقق من تسجيل الدخول.', 'a.noLib': 'مكتبة Supabase لم يتم تحميلها. تأكد من اتصال الإنترنت.',
      'a.stat.products': 'إجمالي المنتجات', 'a.stat.orders': 'طلبات الشراء المسجلة',
      'a.form.add': '➕ إضافة منتج جديد', 'a.form.edit': '✏️ تعديل المنتج',
      'a.f.name': 'اسم المنتج *', 'a.f.namePh': 'مثال: سماعة لاسلكية', 'a.f.price': 'السعر بالجنيه *',
      'a.f.discount': 'نسبة الخصم (%)', 'a.f.category': 'القسم *', 'a.f.stock': 'الكمية المتاحة',
      'a.f.desc': 'وصف المنتج', 'a.f.descPh': 'اكتب وصفًا مختصرًا', 'a.f.image': 'صورة المنتج',
      'a.f.imageHint': 'اختار صورة واضحة بصيغة JPG أو PNG أو WebP، بحد أقصى 1 ميجابايت.',
      'a.f.save': 'حفظ المنتج', 'a.f.saveEdit': 'حفظ التعديلات', 'a.f.cancel': 'إلغاء التعديل',
      'a.products': '📦 منتجات المتجر', 'a.orders': '🧾 طلبات الشراء (الدفع عند الاستلام)', 'a.ordersRefresh': '🔄 تحديث الطلبات',
      'a.loading': 'جارٍ تحميل المنتجات...', 'a.loaded': 'تم تحميل {n} منتج.', 'a.noProducts': 'لا توجد منتجات في قاعدة البيانات.',
      'a.noneFound': 'لم يتم العثور على منتجات.', 'a.loadFail': 'تعذر تحميل المنتجات: {m}',
      'a.edit': 'تعديل', 'a.delete': 'حذف', 'a.cat': 'القسم: {v}', 'a.qty': 'الكمية: {v}', 'a.disc': 'الخصم: {v}%',
      'a.productImg': 'صورة المنتج', 'a.editHint': 'عدّل البيانات ثم احفظها. اترك الصورة فارغة للاحتفاظ بالحالية.',
      'a.confirmDel': 'هل تريد حذف "{name}"؟', 'a.delFail': 'فشل الحذف: {m}',
      'a.delNone': 'لم يتم حذف أي منتج من قاعدة البيانات. غالبًا سياسات الأمان (RLS) تمنع الحذف — شغّل ملف supabase-setup.sql.',
      'a.deleted': 'تم حذف المنتج من قاعدة البيانات.', 'a.deletedStale': 'تم الحذف، لكن تعذر تحديث القائمة: {m}',
      'a.v.nameprice': 'اكتب اسمًا صحيحًا وسعرًا أكبر من صفر.', 'a.v.discount': 'نسبة الخصم لازم تكون من 0 إلى 99.',
      'a.v.stock': 'الكمية لازم تكون رقمًا صحيحًا لا يقل عن صفر.', 'a.v.missing': 'المنتج غير موجود. حدّث القائمة وجرب تاني.',
      'a.v.imgType': 'اختار صورة JPG أو PNG أو WebP.', 'a.v.imgSize': 'حجم الصورة أكبر من 1 ميجابايت. صغّرها وجرب تاني.',
      'a.saveNone': 'لم يتم حفظ أي تغيير في قاعدة البيانات. غالبًا سياسات الأمان (RLS) تمنع الكتابة — شغّل ملف supabase-setup.sql.',
      'a.saved': 'تم حفظ المنتج الجديد بنجاح.', 'a.updated': 'تم تحديث المنتج بنجاح.', 'a.saveFail': 'تعذر حفظ المنتج: {m}',
      'a.canceled': 'تم إلغاء التعديل.',
      'a.order': 'طلب #{n}', 'a.total': 'الإجمالي: {v}', 'a.cod': '(الدفع عند الاستلام)', 'a.ship': 'الشحن: {v}',
      'a.saveStatus': 'حفظ الحالة', 'a.ordersEmpty': 'لا توجد طلبات حتى الآن.', 'a.ordersFail': 'تعذر تحميل الطلبات.',
      'a.ordersFailMsg': 'تعذر تحميل الطلبات: {m} — تأكد من تشغيل ملف supabase-orders.sql.',
      'a.refreshing': 'جارٍ التحديث...', 'a.refreshed': 'تم تحديث الطلبات.',
      'a.confirmCancel': 'إلغاء الطلب سيعيد الكميات للمخزون ولا يمكن التراجع عنه. متأكد؟',
      'a.statusFail': 'تعذر تحديث الحالة: {m}',
      'a.statusNone': 'لم يتم تحديث الحالة. غالبًا سياسات الأمان تمنع التعديل — شغّل supabase-orders.sql.',
      'a.statusOk': 'تم تحديث حالة الطلب.',
      'a.s.title': '🚚 أسعار الشحن حسب المحافظة',
      'a.s.help': 'السعر الافتراضي 80 ج.م لكل محافظة. التعديل يسري على الطلبات الجديدة فقط؛ الطلبات القديمة تحتفظ بسعر الشحن وقت إنشائها.',
      'a.s.save': 'حفظ أسعار الشحن', 'a.s.saving': 'جارٍ الحفظ...', 'a.s.saved': 'تم حفظ أسعار الشحن.',
      'a.s.invalid': 'أسعار الشحن لازم تكون أرقامًا لا تقل عن صفر.',
      'a.s.fail': 'تعذر حفظ أسعار الشحن: {m}',
      'a.s.none': 'لم يتم حفظ أسعار الشحن. غالبًا سياسات الأمان (RLS) تمنع الكتابة — شغّل sql/01-shipping.sql.',
      'a.s.loadFail': 'تعذر تحميل أسعار الشحن (تُعرض القيم الافتراضية): {m}',

      /* ---- لوحة التحكم: خيارات المنتج والصور الإضافية ---- */
      'a.hasOpts': 'يحتوي على خيارات',
      'a.o.title': '⚙️ خيارات المنتج (اختياري)',
      'a.o.help': 'أضف مجموعات خيارات مثل اللون والمقاس والسعة. لو ما أضفتش أي مجموعة يشتغل المنتج بالطريقة العادية.',
      'a.o.loading': 'جارٍ تحميل الخيارات والصور...',
      'a.o.loadFail': 'تعذر تحميل الخيارات والصور: {m} — تأكد من تشغيل ملف sql/02-variants-and-images.sql. لن يتم تغيير الخيارات والصور عند الحفظ.',
      'a.o.addColor': '➕ لون', 'a.o.addSize': '➕ مقاس', 'a.o.addCap': '➕ سعة', 'a.o.addCustom': '➕ خيار مخصص',
      'a.o.nameColor': 'اللون', 'a.o.nameSize': 'المقاس', 'a.o.nameCap': 'السعة',
      'a.o.groupName': 'اسم المجموعة (مثال: اللون)',
      'a.o.type.color': 'دوائر ألوان', 'a.o.type.buttons': 'أزرار', 'a.o.type.select': 'قائمة منسدلة',
      'a.o.required': 'إجباري', 'a.o.delGroup': 'حذف المجموعة',
      'a.o.valuePh': 'القيمة (مثال: أسود)', 'a.o.delValue': 'حذف القيمة', 'a.o.addValue': '➕ إضافة قيمة',
      'a.o.maxGroups': 'الحد الأقصى {n} مجموعات خيارات.', 'a.o.maxValues': 'الحد الأقصى {n} قيمة في المجموعة.',
      'a.o.modeTitle': 'هل الخيارات تغيّر السعر أو المخزون؟',
      'a.o.modeShared': 'لا — كل الاختيارات بنفس السعر والمخزون الأساسي للمنتج',
      'a.o.modeVariants': 'نعم — سعر ومخزون مستقل لكل تركيبة',
      'a.o.variantsTitle': 'التركيبات',
      'a.o.variantsHelp': 'اترك السعر فاضيًا لاستخدام سعر المنتج الأساسي. المخزون مطلوب لكل تركيبة. في هذا الوضع كل الخيارات إجبارية على العميل.',
      'a.o.bulk': 'تطبيق على الكل:', 'a.o.apply': 'تطبيق',
      'a.o.colCombo': 'التركيبة', 'a.o.colPrice': 'السعر (اختياري)', 'a.o.colStock': 'المخزون', 'a.o.colActive': 'متاحة',
      'a.o.totalStock': 'إجمالي مخزون التركيبات المتاحة: {n}',
      'a.o.tooMany': 'عدد التركيبات ({n}) أكبر من الحد المسموح (200). قلّل القيم أو المجموعات.',
      'a.o.v.groupName': 'اكتب اسمًا لكل مجموعة خيارات.',
      'a.o.v.groupEmpty': 'المجموعة "{g}" لازم تحتوي على قيمة واحدة على الأقل.',
      'a.o.v.groupDup': 'اسم المجموعة "{g}" مكرر.',
      'a.o.v.valueDup': 'القيمة "{v}" مكررة داخل المجموعة "{g}".',
      'a.o.v.variantStock': 'اكتب مخزونًا صحيحًا (رقم صحيح لا يقل عن صفر) للتركيبة: {c}',
      'a.o.v.variantPrice': 'سعر التركيبة "{c}" لازم يكون رقمًا لا يقل عن صفر.',
      'a.o.fail': 'تم حفظ المنتج لكن تعذر حفظ الخيارات والصور: {m} — أنت الآن في وضع تعديل المنتج، صحّح وأعد الحفظ.',
      'a.o.skipped': '(لم يتم تغيير الخيارات والصور لأنها لم تُحمَّل.)',
      'a.g.title': '🖼️ صور إضافية للمنتج',
      'a.g.help': 'اختيارية بالكامل — اتركها فاضية لو مش محتاجها. الصورة الرئيسية تفضل كما هي. تقدر تربط أي صورة بقيمة خيار (مثل لون) لتظهر عند اختياره.',
      'a.g.empty': 'لا توجد صور إضافية.', 'a.g.new': 'جديدة — ستُرفع عند الحفظ', 'a.g.saved': 'محفوظة',
      'a.g.link': 'ربط بخيار:', 'a.g.noLink': 'بدون ربط',
      'a.g.up': 'تقديم', 'a.g.down': 'تأخير', 'a.g.remove': 'إزالة',
      'a.g.tooMany': 'الحد الأقصى {n} صورة إضافية.', 'a.g.added': 'تمت إضافة {n} صورة (ستُرفع عند الحفظ).',
      'a.g.uploading': 'جارٍ رفع الصور ({i}/{n})...'
    },

    en: {
      'toggle.lang': 'Change language', 'toggle.theme': 'Toggle dark / light mode',
      'lang.btn': 'عربي', 'currency': 'EGP',
      'cat.phones.label': 'Phones', 'cat.phones.desc': 'Latest smartphones',
      'cat.headphones.label': 'Headphones', 'cat.headphones.desc': 'Pure sound, great isolation',
      'cat.accessories.label': 'Accessories', 'cat.accessories.desc': 'Chargers, cables & more',
      'cat.watches.label': 'Smartwatches', 'cat.watches.desc': 'Track your health & time',
      'status.new': 'New', 'status.processing': 'Processing', 'status.shipped': 'Shipped',
      'status.delivered': 'Delivered', 'status.cancelled': 'Cancelled',
      'status.pending': 'Pending', 'status.confirmed': 'Confirmed', 'status.preparing': 'Preparing',

      'doc.title': 'ElectroStore | Electronics & Accessories Store',
      'skip': 'Skip to products',
      'announce': '🚧 This store is under development — Cash on delivery',
      'logo.aria': 'ElectroStore - Home',
      'menu.open': 'Open menu', 'nav.aria': 'Store categories',
      'nav.home': 'Home', 'nav.all': 'All products',
      'search.label': 'Search for a product', 'search.ph': 'Search phones, headphones, chargers...', 'search.btn': 'Search',
      'cart.aria': 'Shopping cart',
      'hero.eyebrow': 'The world of tech at your fingertips', 'hero.h1a': 'Advanced technology', 'hero.h1b': 'in premium design',
      'hero.p': 'Discover phones, headphones, smartwatches and accessories, with a fast and easy shopping experience on every device.',
      'hero.shop': 'Shop now', 'hero.browse': 'Browse categories',
      'hero.p1': '✔ Responsive design', 'hero.p2': '✔ Instant search', 'hero.p3': '✔ Interactive cart',
      'cats.title': 'Shop by category', 'cats.sub': 'Pick a category and start browsing',
      'prod.title': 'Our products', 'prod.filter': 'Filter products by category', 'chip.all': 'All',
      'sort.label': 'Sort:', 'sort.default': 'Default', 'sort.asc': 'Price: low to high',
      'sort.desc': 'Price: high to low', 'sort.rating': 'Top rated',
      'empty.title': 'No results',
      'empty.text': 'We couldn\'t find products matching "{term}". Try another word or pick a different category.',
      'empty.reset': 'Show all products', 'empty.thisCat': 'this category',
      'footer.about': 'Electronics & accessories store — project under development.', 'footer.cats': 'Categories',
      'footer.noteTitle': 'Note', 'footer.note': 'Payment is currently cash on delivery only. Online payment will be added later.',
      'footer.rights': 'ElectroStore — All rights reserved',
      'cartd.title': 'Shopping cart', 'cartd.close': 'Close cart', 'cartd.empty': 'Your cart is empty',
      'cartd.start': 'Start shopping', 'cartd.total': 'Total', 'cartd.checkout': 'Checkout',
      'cartd.clear': 'Clear cart', 'cartd.note': 'Cash on delivery. Shipping is calculated at checkout.',
      'cartd.qty': 'Quantity', 'cartd.dec': 'Decrease', 'cartd.inc': 'Increase', 'cartd.remove': 'Remove {name} from cart',
      'co.title': 'Checkout', 'co.sub': 'Enter your delivery details. You pay on delivery.', 'co.close': 'Close',
      'co.name': 'Full name *', 'co.phone': 'Mobile number *', 'co.gov': 'Governorate *',
      'co.govPick': 'Select governorate', 'co.address': 'Detailed address *',
      'co.addressPh': 'City / District / Street / Building no. / Floor', 'co.notes': 'Notes (optional)',
      'co.pay': '💵 Payment method: Cash on delivery', 'co.confirm': 'Confirm order', 'co.sending': 'Placing order...',
      'co.subtotal': 'Products subtotal', 'co.shipping': 'Shipping', 'co.shipPick': 'Select a governorate to see shipping',
      'co.total': 'Total (cash on delivery)',
      'co.okTitle': 'Your order has been received',
      'co.okText': 'Your order number is #{n} — total {total} including shipping (cash on delivery). We will contact you on {phone} to confirm.',
      'co.continue': 'Continue shopping',
      'v.name': 'Please enter your full name.',
      'v.phone': 'Mobile number must be 11 digits and start with 010, 011, 012 or 015.',
      'v.gov': 'Please select a governorate.', 'v.address': 'Please enter a detailed address.', 'v.cartEmpty': 'Your cart is empty.',
      'v.noDb': 'Could not connect to the database. Refresh the page and try again.',
      'v.orderFail': 'Could not place the order. An item may be out of stock or changed — review your cart and try again.',
      's.noScripts': 'Failed to load site files (js/products.js or js/i18n.js) — check file names and locations, then reload.',
      's.loading': 'Loading products...', 's.none': 'No products yet', 's.noneSub': 'New products coming soon.',
      's.fail': 'Failed to load products', 's.failSub': 'Check your internet connection and try again.', 's.retry': 'Retry',
      's.noLib': 'The Supabase library failed to load.',
      'count.n': '{n} products', 'results': 'Showing {n} products',
      'badge.soldout': 'Out of stock', 'badge.discount': '{n}% off', 'card.add': '🛒 Add to cart',
      'stock.available': 'Available: {n} pcs', 'stock.out': 'Out of stock',
      'toast.unavailable': 'This product is currently unavailable',
      'toast.max': 'Maximum available quantity of "{name}" is {n}', 'toast.maxShort': 'Maximum available quantity is {n}',
      'toast.added': '"{name}" added to cart', 'toast.cleared': 'Cart cleared', 'toast.empty': 'Your cart is empty',
      'disc': '{n}% off',

      'card.choose': 'Choose options', 'card.from': 'From',
      'toast.pickOptions': 'Please choose all required options first',
      'pd.close': 'Close', 'pd.prev': 'Previous image', 'pd.next': 'Next image', 'pd.slide': 'Show image {n}',
      'pd.choose': 'Choose...', 'pd.pick': 'Please choose: {names}',
      'pd.pickForStock': 'Choose options to see availability.',
      'pd.unavailableCombo': 'This combination is currently unavailable.',
      'pd.maxInCart': 'You have the maximum available quantity in your cart.',

      'a.title': 'Dashboard | ElectroStore', 'a.header': '⚡ ElectroStore — Dashboard',
      'a.back': 'Back to store ↩', 'a.logout': 'Log out',
      'a.login.title': '🔐 Admin login', 'a.email': 'Email', 'a.emailPh': 'Enter admin email',
      'a.password': 'Password', 'a.passwordPh': 'Enter password', 'a.login': 'Log in',
      'a.loggingIn': 'Logging in...', 'a.loginFail': 'Login failed. Check your email and password.',
      'a.notAdmin': 'This account is not authorized to access the dashboard.', 'a.loggedOut': 'Logged out.',
      'a.checkFail': 'Could not verify login.', 'a.noLib': 'Supabase library failed to load. Check your internet connection.',
      'a.stat.products': 'Total products', 'a.stat.orders': 'Recorded orders',
      'a.form.add': '➕ Add new product', 'a.form.edit': '✏️ Edit product',
      'a.f.name': 'Product name *', 'a.f.namePh': 'e.g. Wireless headphones', 'a.f.price': 'Price (EGP) *',
      'a.f.discount': 'Discount (%)', 'a.f.category': 'Category *', 'a.f.stock': 'Available quantity',
      'a.f.desc': 'Description', 'a.f.descPh': 'Write a short description', 'a.f.image': 'Product image',
      'a.f.imageHint': 'Choose a clear JPG, PNG or WebP image, up to 1 MB.',
      'a.f.save': 'Save product', 'a.f.saveEdit': 'Save changes', 'a.f.cancel': 'Cancel editing',
      'a.products': '📦 Store products', 'a.orders': '🧾 Orders (cash on delivery)', 'a.ordersRefresh': '🔄 Refresh orders',
      'a.loading': 'Loading products...', 'a.loaded': '{n} products loaded.', 'a.noProducts': 'No products in the database.',
      'a.noneFound': 'No products found.', 'a.loadFail': 'Failed to load products: {m}',
      'a.edit': 'Edit', 'a.delete': 'Delete', 'a.cat': 'Category: {v}', 'a.qty': 'Stock: {v}', 'a.disc': 'Discount: {v}%',
      'a.productImg': 'Product image', 'a.editHint': 'Edit the data then save. Leave the image empty to keep the current one.',
      'a.confirmDel': 'Delete "{name}"?', 'a.delFail': 'Delete failed: {m}',
      'a.delNone': 'No product was deleted. Row Level Security (RLS) policies are probably blocking it — run supabase-setup.sql.',
      'a.deleted': 'Product deleted from the database.', 'a.deletedStale': 'Deleted, but the list could not be refreshed: {m}',
      'a.v.nameprice': 'Enter a valid name and a price greater than zero.', 'a.v.discount': 'Discount must be between 0 and 99.',
      'a.v.stock': 'Quantity must be a whole number, zero or more.', 'a.v.missing': 'Product not found. Refresh the list and try again.',
      'a.v.imgType': 'Choose a JPG, PNG or WebP image.', 'a.v.imgSize': 'Image is larger than 1 MB. Reduce it and try again.',
      'a.saveNone': 'No change was saved. RLS policies are probably blocking writes — run supabase-setup.sql.',
      'a.saved': 'New product saved successfully.', 'a.updated': 'Product updated successfully.', 'a.saveFail': 'Could not save product: {m}',
      'a.canceled': 'Editing cancelled.',
      'a.order': 'Order #{n}', 'a.total': 'Total: {v}', 'a.cod': '(cash on delivery)', 'a.ship': 'Shipping: {v}',
      'a.saveStatus': 'Save status', 'a.ordersEmpty': 'No orders yet.', 'a.ordersFail': 'Could not load orders.',
      'a.ordersFailMsg': 'Could not load orders: {m} — make sure supabase-orders.sql was run.',
      'a.refreshing': 'Refreshing...', 'a.refreshed': 'Orders refreshed.',
      'a.confirmCancel': 'Cancelling the order returns the quantities to stock and cannot be undone. Are you sure?',
      'a.statusFail': 'Could not update status: {m}',
      'a.statusNone': 'Status not updated. Security policies are probably blocking it — run supabase-orders.sql.',
      'a.statusOk': 'Order status updated.',
      'a.s.title': '🚚 Shipping rates by governorate',
      'a.s.help': 'Default rate is EGP 80 per governorate. Changes apply to new orders only; existing orders keep the shipping cost from when they were placed.',
      'a.s.save': 'Save shipping rates', 'a.s.saving': 'Saving...', 'a.s.saved': 'Shipping rates saved.',
      'a.s.invalid': 'Shipping rates must be numbers, zero or more.',
      'a.s.fail': 'Could not save shipping rates: {m}',
      'a.s.none': 'Shipping rates were not saved. RLS policies are probably blocking writes — run sql/01-shipping.sql.',
      'a.s.loadFail': 'Could not load shipping rates (defaults shown): {m}',

      'a.hasOpts': 'Has options',
      'a.o.title': '⚙️ Product options (optional)',
      'a.o.help': 'Add option groups such as color, size and capacity. With no groups the product works as usual.',
      'a.o.loading': 'Loading options and images...',
      'a.o.loadFail': 'Could not load options and images: {m} — make sure sql/02-variants-and-images.sql was run. Options and images will not be changed on save.',
      'a.o.addColor': '➕ Color', 'a.o.addSize': '➕ Size', 'a.o.addCap': '➕ Capacity', 'a.o.addCustom': '➕ Custom option',
      'a.o.nameColor': 'Color', 'a.o.nameSize': 'Size', 'a.o.nameCap': 'Capacity',
      'a.o.groupName': 'Group name (e.g. Color)',
      'a.o.type.color': 'Color swatches', 'a.o.type.buttons': 'Buttons', 'a.o.type.select': 'Dropdown',
      'a.o.required': 'Required', 'a.o.delGroup': 'Delete group',
      'a.o.valuePh': 'Value (e.g. Black)', 'a.o.delValue': 'Delete value', 'a.o.addValue': '➕ Add value',
      'a.o.maxGroups': 'Maximum {n} option groups.', 'a.o.maxValues': 'Maximum {n} values per group.',
      'a.o.modeTitle': 'Do the options change price or stock?',
      'a.o.modeShared': 'No — all choices share the product\'s base price and stock',
      'a.o.modeVariants': 'Yes — separate price and stock for each combination',
      'a.o.variantsTitle': 'Combinations',
      'a.o.variantsHelp': 'Leave price empty to use the base price. Stock is required for every combination. In this mode every option is required for the customer.',
      'a.o.bulk': 'Apply to all:', 'a.o.apply': 'Apply',
      'a.o.colCombo': 'Combination', 'a.o.colPrice': 'Price (optional)', 'a.o.colStock': 'Stock', 'a.o.colActive': 'Available',
      'a.o.totalStock': 'Total stock of available combinations: {n}',
      'a.o.tooMany': 'Number of combinations ({n}) exceeds the limit (200). Reduce values or groups.',
      'a.o.v.groupName': 'Enter a name for every option group.',
      'a.o.v.groupEmpty': 'Group "{g}" must have at least one value.',
      'a.o.v.groupDup': 'Group name "{g}" is duplicated.',
      'a.o.v.valueDup': 'Value "{v}" is duplicated in group "{g}".',
      'a.o.v.variantStock': 'Enter a valid stock (whole number, zero or more) for combination: {c}',
      'a.o.v.variantPrice': 'Price of combination "{c}" must be a number, zero or more.',
      'a.o.fail': 'Product saved, but options and images could not be saved: {m} — you are now in edit mode, fix and save again.',
      'a.o.skipped': '(Options and images were not changed because they were not loaded.)',
      'a.g.title': '🖼️ Additional product images',
      'a.g.help': 'Fully optional — leave empty if you don\'t need them. The main image stays as is. You can link an image to an option value (e.g. a color) so it shows when selected.',
      'a.g.empty': 'No additional images.', 'a.g.new': 'New — uploaded on save', 'a.g.saved': 'Saved',
      'a.g.link': 'Link to option:', 'a.g.noLink': 'No link',
      'a.g.up': 'Move up', 'a.g.down': 'Move down', 'a.g.remove': 'Remove',
      'a.g.tooMany': 'Maximum {n} additional images.', 'a.g.added': '{n} image(s) added (uploaded on save).',
      'a.g.uploading': 'Uploading images ({i}/{n})...'
    }
  };

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  var lang = read(LANG_KEY) === 'en' ? 'en' : 'ar'; // العربية افتراضية
  var theme = read(THEME_KEY);
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] !== undefined ? vars[k] : m;
    });
  }
  function tIn(l, key, vars) {
    var s = DICT[l][key];
    if (s === undefined) s = DICT.ar[key];
    return fill(s === undefined ? key : s, vars);
  }
  function t(key, vars) { return tIn(lang, key, vars); }

  function applyDoc() {
    var de = document.documentElement;
    de.lang = lang;
    de.dir = lang === 'ar' ? 'rtl' : 'ltr';
    de.setAttribute('data-theme', theme);
  }

  function updateToggles() {
    var lb = document.getElementById('langBtn');
    if (lb) { lb.textContent = '🌐'; lb.setAttribute('aria-label', t('toggle.lang')); lb.title = t('toggle.lang') + ' (' + t('lang.btn') + ')'; }
    var tb = document.getElementById('themeBtn');
    if (tb) {
      tb.textContent = theme === 'dark' ? '☀️' : '🌙';
      tb.setAttribute('aria-label', t('toggle.theme')); tb.title = t('toggle.theme');
    }
  }

  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (n) { n.setAttribute('placeholder', t(n.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-aria'))); });
    updateToggles();
  }

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'ar';
    write(LANG_KEY, lang);
    applyDoc();
    applyI18n();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function setTheme(th) {
    theme = th === 'dark' ? 'dark' : 'light';
    write(THEME_KEY, theme);
    applyDoc();
    updateToggles();
  }

  applyDoc(); // قبل أول رسم

  document.addEventListener('DOMContentLoaded', function () {
    applyI18n();
    var lb = document.getElementById('langBtn');
    if (lb) lb.addEventListener('click', function () { setLang(lang === 'ar' ? 'en' : 'ar'); });
    var tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark'); });
  });

  window.I18N = {
    t: t, tIn: tIn, applyI18n: applyI18n, setLang: setLang, setTheme: setTheme,
    getLang: function () { return lang; },
    locale: function () { return lang === 'ar' ? 'ar-EG' : 'en-US'; },
    GOVERNORATES: GOVERNORATES,
    govLabel: function (ar) {
      for (var i = 0; i < GOVERNORATES.length; i++) if (GOVERNORATES[i].ar === ar) return lang === 'ar' ? ar : GOVERNORATES[i].en;
      return ar;
    }
  };
})();