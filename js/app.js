/* =============================================================
   app.js — منطقة التسوق
   - المنتجات تأتي من جدول products في Supabase
   - خيارات المنتج (لون/مقاس/سعة/مخصص) + تركيبات بسعر ومخزون مستقل
   - صور إضافية + نافذة تفاصيل المنتج
   - البحث والفلترة والترتيب
   - السلة (تُحفظ في المتصفح فقط) — العنصر = منتج + اختياراته
   - لغتان (ar/en) + شحن حسب المحافظة (يُتحقق منه على الخادم)
   ============================================================= */
(() => {
  'use strict';

  if (
    typeof I18N === 'undefined' ||
    typeof CATEGORIES === 'undefined' ||
    typeof STORE_CONFIG === 'undefined' ||
    typeof createIllustration === 'undefined'
  ) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="background:#fee2e2;color:#991b1b;padding:16px;text-align:center;font-weight:700">' +
        'تعذّر تحميل ملفات الموقع (js/products.js أو js/i18n.js) — تأكد من أسماء الملفات ومكانها ثم أعد تحميل الصفحة.<br>' +
        'Failed to load site files (js/products.js or js/i18n.js).' +
        '</div>'
    );
    return;
  }

  const t = (key, vars) => I18N.t(key, vars);

  /* ---------- أدوات مساعدة ---------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHTML = (text) =>
    String(text ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

  // توحيد النص العربي لتحسين البحث
  const normalize = (text) =>
    String(text ?? '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();

  let moneyFmt;
  let numFmt;
  function setFormatters() {
    const locale = I18N.locale();
    moneyFmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: STORE_CONFIG.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    numFmt = new Intl.NumberFormat(locale);
  }
  setFormatters();
  const money = (n) => moneyFmt.format(n);

  const catLabel = (id) => t(`cat.${id}.label`);
  const catDesc = (id) => t(`cat.${id}.desc`);

  /* ---------- الثوابت والبيانات ---------- */
  const BUCKET = 'products';
  const CART_KEY = 'electrostore_cart_v2';
  const FALLBACK_COLORS = ['#2563eb', '#06b6d4'];
  const DEFAULT_SHIPPING = 80; // يُستخدم للعرض فقط لو تعذر جلب الأسعار؛ الخادم هو المرجع
  const OPTIONS_SELECT =
    '*, product_option_groups(*, product_option_values(*)), product_variants(*), product_images(*)';

  const categoryById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const byPos = (a, b) => (a.position || 0) - (b.position || 0);

  let ALL_PRODUCTS = [];
  let productById = new Map();
  let lastLoadedAt = 0;
  let categoriesRendered = false;
  let shippingRates = {}; // اسم المحافظة (عربي) -> التكلفة
  let lastOrder = null; // آخر طلب ناجح لإعادة كتابة رسالة النجاح عند تغيير اللغة

  function publicUrl(path) {
    if (!path || !window.supabaseClient) return '';
    const { data } = window.supabaseClient.storage.from(BUCKET).getPublicUrl(path);
    return (data && data.publicUrl) || '';
  }

  function getImageSrc(row) {
    for (const v of [row.image_url, row.image]) {
      if (typeof v === 'string' && /^(https?:\/\/|data:image\/)/i.test(v.trim())) {
        return v.trim();
      }
    }
    const path = typeof row.image === 'string' ? row.image.trim() : '';
    return path ? publicUrl(path) : '';
  }

  /* ---------- تحويل صف قاعدة البيانات إلى منتج ---------- */
  function normalizeProduct(row) {
    const stockNum = row.stock == null ? 99 : Number(row.stock);
    const colors =
      Array.isArray(row.colors) && row.colors.length >= 2 ? row.colors : FALLBACK_COLORS;

    // مجموعات الخيارات
    const groups = (row.product_option_groups || [])
      .slice()
      .sort(byPos)
      .map((g) => ({
        id: g.id,
        name: String(g.name || ''),
        type: ['color', 'buttons', 'select'].includes(g.type) ? g.type : 'buttons',
        required: !!g.required,
        values: (g.product_option_values || [])
          .slice()
          .sort(byPos)
          .map((v) => ({ id: v.id, label: String(v.label || ''), color: v.color_hex || null }))
      }))
      .filter((g) => g.values.length > 0);

    const mode = groups.length === 0 ? 'none' : row.variant_mode === 'variants' ? 'variants' : 'shared';

    // التركيبات (النشطة فقط)
    const variants = new Map();
    if (mode === 'variants') {
      (row.product_variants || []).forEach((v) => {
        if (v.is_active === false) return;
        variants.set(v.combo_key, {
          id: v.id,
          price: v.price == null ? null : Number(v.price),
          stock: Math.max(0, Math.floor(Number(v.stock) || 0))
        });
      });
    }

    // الصور الإضافية
    const images = (row.product_images || [])
      .slice()
      .sort(byPos)
      .map((i) => ({ id: i.id, url: publicUrl(i.path), valueId: i.option_value_id || null }))
      .filter((i) => i.url);

    let stock = Number.isFinite(stockNum) ? Math.max(0, Math.floor(stockNum)) : 0;
    if (mode === 'variants') {
      stock = [...variants.values()].reduce((sum, v) => sum + v.stock, 0);
    }

    const product = {
      id: String(row.id),
      name: String(row.name || ''),
      category: row.category,
      price: Number(row.price) || 0,
      discount: Math.max(0, Math.min(99, Number(row.discount) || 0)),
      stock,
      rating: Number(row.rating) || 0,
      reviews: Number(row.reviews) || 0,
      description: String(row.description || ''),
      colors,
      image: getImageSrc(row),
      groups,
      mode,
      variants,
      images
    };

    // البحث يعمل بالاسم العربي والإنجليزي للقسم + أسماء الخيارات وقيمها
    const optionText = groups.map((g) => `${g.name} ${g.values.map((v) => v.label).join(' ')}`).join(' ');
    product.searchText = normalize(
      `${product.name} ${I18N.tIn('ar', `cat.${product.category}.label`)} ${I18N.tIn('en', `cat.${product.category}.label`)} ${product.description} ${optionText}`
    );
    return product;
  }

  async function fetchProducts() {
    const client = window.supabaseClient;
    if (!client) throw new Error(t('s.noLib'));

    // الكمية والخيارات تُجلب دائمًا من قاعدة البيانات (لا قيم ثابتة في HTML)
    let res = await client
      .from('products')
      .select(OPTIONS_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (res.error) {
      // لو لم يتم تشغيل ملف SQL الجديد بعد، يعمل المتجر بالطريقة القديمة
      console.warn('Options query failed, falling back to plain products:', res.error.message);
      res = await client
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    }

    if (res.error) throw res.error;

    const list = (res.data || [])
      .map(normalizeProduct)
      .filter((p) => {
        const ok = p.id && p.name && p.price > 0 && categoryById[p.category];
        if (!ok) console.warn('تم تجاهل منتج غير صالح:', p);
        return ok;
      });

    ALL_PRODUCTS = list;
    productById = new Map(list.map((p) => [p.id, p]));
  }

  // أسعار الشحن (قراءة عامة). الخادم يعيد التحقق منها عند إنشاء الطلب.
  async function fetchShippingRates() {
    const client = window.supabaseClient;
    if (!client) return;
    try {
      const { data, error } = await client.from('shipping_rates').select('governorate, cost');
      if (error) throw error;
      shippingRates = Object.fromEntries((data || []).map((r) => [r.governorate, Number(r.cost)]));
    } catch (err) {
      console.warn('Shipping rates error:', err);
    }
  }

  const shippingFor = (gov) => {
    if (!gov) return null;
    const v = shippingRates[gov];
    return Number.isFinite(v) ? v : DEFAULT_SHIPPING;
  };

  // نفس معادلة الخادم: round(price * (1 - discount/100), 2)
  const finalPrice = (p, base = p.price) =>
    Math.round(base * (1 - p.discount / 100) * 100) / 100;

  /* ---------- الخيارات والتركيبات ---------- */
  const comboKey = (ids) => [...ids].sort().join(',');
  const lineKey = (id, sel) => `${id}::${comboKey(Object.values(sel || {}))}`;

  // نتيجة اختيارات العميل: هل اكتملت؟ السعر؟ المخزون؟
  function resolve(p, sel) {
    const missing = p.groups.filter(
      (g) => (g.required || p.mode === 'variants') && !sel[g.id]
    );
    const out = {
      missing,
      complete: missing.length === 0,
      variant: null,
      price: p.price,
      stock: p.stock,
      unavailable: false
    };

    if (p.mode === 'variants') {
      if (out.complete) {
        const variant = p.variants.get(comboKey(p.groups.map((g) => sel[g.id])));
        if (!variant) {
          out.unavailable = true;
          out.stock = 0;
        } else {
          out.variant = variant;
          out.stock = variant.stock;
          out.price = variant.price == null ? p.price : variant.price;
        }
      } else {
        out.stock = null; // غير معروف قبل اكتمال الاختيار
      }
    }
    return out;
  }

  function selectionValid(p, sel) {
    const keys = Object.keys(sel || {});
    if (p.groups.length === 0) return keys.length === 0;
    return keys.every((k) => {
      const g = p.groups.find((x) => x.id === k);
      return g && g.values.some((v) => v.id === sel[k]);
    });
  }

  function selLabels(p, sel) {
    return p.groups
      .map((g) => {
        const v = g.values.find((x) => x.id === (sel || {})[g.id]);
        return v ? { group: g.name, label: v.label, color: g.type === 'color' ? v.color : null } : null;
      })
      .filter(Boolean);
  }

  // أول صورة إضافية مرتبطة بقيمة مختارة (بترتيب المجموعات)
  function imageForSel(p, sel) {
    for (const g of p.groups) {
      const vid = (sel || {})[g.id];
      if (!vid) continue;
      const img = p.images.find((i) => i.valueId === vid);
      if (img) return img.url;
    }
    return null;
  }

  function priceRange(p) {
    if (p.mode === 'variants' && p.variants.size) {
      const prices = [...p.variants.values()].map((v) => (v.price == null ? p.price : v.price));
      return { lo: Math.min(...prices), hi: Math.max(...prices) };
    }
    return { lo: p.price, hi: p.price };
  }

  // مخزون "المجموعة" التي يسحب منها السطر: التركيبة (لو وُجدت) وإلا المنتج
  function poolOf(line) {
    const p = productById.get(line.id);
    if (!p) return null;
    const r = resolve(p, line.sel || {});
    if (!r.complete || r.unavailable) return null;
    return r.variant
      ? { key: `v:${r.variant.id}`, stock: r.variant.stock }
      : { key: `p:${p.id}`, stock: p.stock };
  }

  // أقصى كمية مسموحة لهذا السطر بعد خصم باقي السطور من نفس المخزون
  function lineMax(line) {
    const pool = poolOf(line);
    if (!pool) return 0;
    const used = state.cart
      .filter((l) => l !== line && poolOf(l) && poolOf(l).key === pool.key)
      .reduce((sum, l) => sum + l.qty, 0);
    return Math.max(0, Math.min(99, pool.stock - used));
  }

  /* ---------- الحالة ---------- */
  const state = {
    category: 'all',
    query: '',
    sort: 'default',
    cart: loadCart()
  };

  /* ---------- عناصر الصفحة ---------- */
  const el = {
    header: $('#siteHeader'),
    menuToggle: $('#menuToggle'),
    mainNav: $('#mainNav'),
    searchForm: $('#searchForm'),
    searchInput: $('#searchInput'),
    heroVisual: $('#heroVisual'),
    categoryGrid: $('#categoryGrid'),
    chips: $('#chips'),
    sortSelect: $('#sortSelect'),
    resultsInfo: $('#resultsInfo'),
    productGrid: $('#productGrid'),
    emptyState: $('#emptyState'),
    emptyText: $('#emptyText'),
    resetFilters: $('#resetFilters'),
    cartBtn: $('#cartBtn'),
    cartCount: $('#cartCount'),
    drawer: $('#cartDrawer'),
    overlay: $('#overlay'),
    closeCart: $('#closeCart'),
    cartItems: $('#cartItems'),
    cartEmpty: $('#cartEmpty'),
    cartFoot: $('#cartFoot'),
    cartTotal: $('#cartTotal'),
    checkoutBtn: $('#checkoutBtn'),
    clearCart: $('#clearCart'),
    startShopping: $('#startShopping'),
    toastZone: $('#toastZone'),
    year: $('#year'),
    checkoutModal: $('#checkoutModal'),
    checkoutForm: $('#checkoutForm'),
    checkoutFormView: $('#checkoutFormView'),
    checkoutSuccess: $('#checkoutSuccess'),
    successText: $('#successText'),
    successClose: $('#successClose'),
    closeCheckout: $('#closeCheckout'),
    coSummary: $('#coSummary'),
    coName: $('#coName'),
    coPhone: $('#coPhone'),
    coGov: $('#coGov'),
    coAddress: $('#coAddress'),
    coNotes: $('#coNotes'),
    coMsg: $('#coMsg'),
    coSubmit: $('#coSubmit')
  };

  /* ---------- الصورة: حقيقية إن وُجدت وإلا رسم توضيحي ---------- */
  function mediaHTML(p, url, uid) {
    if (url) {
      return `<img src="${escapeHTML(url)}" alt="${escapeHTML(p.name)}" loading="lazy" width="300" height="300"
        data-fallback data-cat="${escapeHTML(p.category)}" data-uid="${escapeHTML(uid)}"
        data-c1="${escapeHTML(p.colors[0])}" data-c2="${escapeHTML(p.colors[1])}" data-name="${escapeHTML(p.name)}">`;
    }
    return createIllustration(p.category, uid, p.colors[0], p.colors[1], escapeHTML(p.name));
  }

  function productMedia(p, prefix, url = p.image) {
    return mediaHTML(p, url, `${prefix}-${p.id}`);
  }

  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !('fallback' in img.dataset)) return;
      img.outerHTML = createIllustration(
        img.dataset.cat,
        img.dataset.uid,
        img.dataset.c1,
        img.dataset.c2,
        escapeHTML(img.dataset.name)
      );
    },
    true
  );

  /* ---------- رسائل الحالة داخل شبكة المنتجات ---------- */
  function showStatus(icon, title, text, withRetry = false) {
    el.emptyState.hidden = true;
    el.productGrid.hidden = false;
    el.productGrid.classList.remove('category-view');
    el.resultsInfo.textContent = '';
    el.productGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon" aria-hidden="true">${icon}</div>
        <h3>${escapeHTML(title)}</h3>
        ${text ? `<p>${escapeHTML(text)}</p>` : ''}
        ${withRetry ? `<button class="btn btn-primary" data-retry>${escapeHTML(t('s.retry'))}</button>` : ''}
      </div>`;
  }

  /* ---------- عرض الأقسام والفلاتر ---------- */
  function renderHero() {
    const picks = [
      { cat: 'phones', c: ['#3b82f6', '#06b6d4'], cls: 'fc1' },
      { cat: 'headphones', c: ['#8b5cf6', '#ec4899'], cls: 'fc2' },
      { cat: 'watches', c: ['#f59e0b', '#ef4444'], cls: 'fc3' }
    ];
    el.heroVisual.innerHTML = picks
      .map(
        (x, i) =>
          `<div class="float-card ${x.cls}">${createIllustration(x.cat, `hero-${i}`, x.c[0], x.c[1], '')}</div>`
      )
      .join('');
  }

  function renderCategories() {
    const revealClass = categoriesRendered ? 'reveal visible' : 'reveal';
    el.categoryGrid.innerHTML = CATEGORIES.map((c) => {
      const count = ALL_PRODUCTS.filter((p) => p.category === c.id).length;
      return `
        <button class="category-card ${revealClass}" data-category="${c.id}">
          <span class="category-icon" aria-hidden="true">${c.icon}</span>
          <h3>${escapeHTML(catLabel(c.id))}</h3>
          <span>${escapeHTML(catDesc(c.id))} · ${escapeHTML(t('count.n', { n: numFmt.format(count) }))}</span>
        </button>`;
    }).join('');
    categoriesRendered = true;
    observeReveal();
  }

  function renderChips() {
    const items = [{ id: 'all', label: t('chip.all') }, ...CATEGORIES.map((c) => ({ id: c.id, label: catLabel(c.id) }))];
    el.chips.innerHTML = items
      .map(
        (c) =>
          `<button class="chip ${state.category === c.id ? 'active' : ''}" role="tab"
            aria-selected="${state.category === c.id}" data-category="${c.id}">${escapeHTML(c.label)}</button>`
      )
      .join('');
  }

  function updateNavActive() {
    $$('.main-nav a').forEach((a) => {
      const isActive =
        a.dataset.category !== undefined && a.dataset.category === state.category;
      a.classList.toggle('active', isActive);
    });
  }

  /* ---------- المنتجات: فلترة + ترتيب + عرض ---------- */
  function getVisibleProducts() {
    const q = normalize(state.query);
    const list = ALL_PRODUCTS.filter(
      (p) =>
        (state.category === 'all' || p.category === state.category) &&
        (q === '' || p.searchText.includes(q))
    );

    const low = (p) => finalPrice(p, priceRange(p).lo);
    const high = (p) => finalPrice(p, priceRange(p).hi);
    if (state.sort === 'price-asc') list.sort((a, b) => low(a) - low(b));
    else if (state.sort === 'price-desc') list.sort((a, b) => high(b) - high(a));
    else if (state.sort === 'rating') list.sort((a, b) => b.rating - a.rating);

    return list;
  }

  function productCard(p, index) {
    const soldOut = p.stock <= 0;
    const range = priceRange(p);
    const price = finalPrice(p, range.lo);
    const hasOptions = p.groups.length > 0;

    let badge = '';
    if (soldOut) badge = `<span class="badge">${escapeHTML(t('badge.soldout'))}</span>`;
    else if (p.discount > 0) badge = `<span class="badge">${escapeHTML(t('badge.discount', { n: p.discount }))}</span>`;

    const stockLine = soldOut
      ? `<div class="stock out">${escapeHTML(t('stock.out'))}</div>`
      : `<div class="stock ${p.stock <= 5 ? 'low' : ''}">${escapeHTML(t('stock.available', { n: numFmt.format(p.stock) }))}</div>`;

    let button;
    if (soldOut) {
      button = `<button class="btn btn-primary add-btn" disabled>${escapeHTML(t('badge.soldout'))}</button>`;
    } else if (hasOptions) {
      button = `<button class="btn btn-primary add-btn" data-open="${escapeHTML(p.id)}">${escapeHTML(t('card.choose'))}</button>`;
    } else {
      button = `<button class="btn btn-primary add-btn" data-add="${escapeHTML(p.id)}">${escapeHTML(t('card.add'))}</button>`;
    }

    return `
      <article class="card" style="--i:${index}">
        <div class="card-media" data-open="${escapeHTML(p.id)}">
          ${badge}
          ${productMedia(p, 'p')}
        </div>
        <div class="card-body">
          <span class="card-cat">${escapeHTML(catLabel(p.category))}</span>
          <h3 class="card-title"><button type="button" class="card-open" data-open="${escapeHTML(p.id)}">${escapeHTML(p.name)}</button></h3>
          <p class="card-desc">${escapeHTML(p.description)}</p>
          ${stockLine}
          <div class="price-row">
            ${range.lo !== range.hi ? `<span class="price-from">${escapeHTML(t('card.from'))}</span>` : ''}
            <span class="price">${money(price)}</span>
            ${p.discount > 0 ? `<span class="old-price">${money(range.lo)}</span>` : ''}
          </div>
          ${button}
        </div>
      </article>`;
  }

  function renderProducts() {
    if (ALL_PRODUCTS.length === 0) {
      showStatus('📦', t('s.none'), t('s.noneSub'));
      return;
    }

    const list = getVisibleProducts();
    el.productGrid.classList.toggle('category-view', state.category === 'all');

    if (state.category !== 'all') {
      el.productGrid.innerHTML = list.map((p, i) => productCard(p, i)).join('');
    } else {
      el.productGrid.innerHTML = CATEGORIES.map((category) => {
        const products = list.filter((p) => p.category === category.id);
        if (products.length === 0) return '';
        return `
          <section class="product-category-section">
            <div class="product-category-heading">
              <h2>${escapeHTML(catLabel(category.id))}</h2>
              <span>${escapeHTML(t('count.n', { n: numFmt.format(products.length) }))}</span>
            </div>
            <div class="category-products-grid">
              ${products.map((p, i) => productCard(p, i)).join('')}
            </div>
          </section>`;
      }).join('');
    }

    el.emptyState.hidden = list.length > 0;
    el.productGrid.hidden = list.length === 0;

    if (list.length === 0) {
      const term = state.query || (categoryById[state.category] ? catLabel(state.category) : t('empty.thisCat'));
      el.emptyText.textContent = t('empty.text', { term });
      el.resultsInfo.textContent = '';
    } else {
      el.resultsInfo.textContent = t('results', { n: numFmt.format(list.length) });
    }
  }

  function setCategory(categoryId, scrollToProducts = true) {
    state.category = categoryById[categoryId] ? categoryId : 'all';
    renderChips();
    updateNavActive();
    renderProducts();
    if (scrollToProducts) $('#products').scrollIntoView({ behavior: 'smooth' });
  }

  function resetFilters() {
    state.query = '';
    state.sort = 'default';
    el.searchInput.value = '';
    el.sortSelect.value = 'default';
    setCategory('all', false);
  }

  /* ---------- تحميل المتجر من قاعدة البيانات ---------- */
  async function loadStore(silent = false) {
    if (!silent) showStatus('⏳', t('s.loading'), '');

    try {
      await fetchProducts();
    } catch (err) {
      console.error('Supabase error:', err);
      if (!silent) showStatus('⚠️', t('s.fail'), t('s.failSub'), true);
      return false;
    }

    lastLoadedAt = Date.now();
    pruneCart();
    renderCategories();
    renderProducts();
    renderCart();
    refreshProductModal();
    return true;
  }

  /* ---------- السلة ---------- */
  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((l) => l && typeof l.id === 'string' && Number.isInteger(l.qty) && l.qty > 0)
        .map((l) => {
          const sel = {};
          if (l.sel && typeof l.sel === 'object' && !Array.isArray(l.sel)) {
            Object.keys(l.sel).forEach((k) => {
              if (typeof l.sel[k] === 'string') sel[k] = l.sel[k];
            });
          }
          return { id: l.id, qty: Math.min(l.qty, 99), sel };
        });
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch {
      /* تجاهل */
    }
  }

  // إزالة المنتجات المحذوفة/غير النشطة والاختيارات التي لم تعد صالحة،
  // وضبط الكميات حسب المخزون (المشترك بين سطور نفس المنتج/التركيبة)
  function pruneCart() {
    const remaining = new Map();
    const next = [];

    for (const l of state.cart) {
      const p = productById.get(l.id);
      if (!p) continue;
      if (!selectionValid(p, l.sel || {})) continue;

      const r = resolve(p, l.sel || {});
      if (!r.complete || r.unavailable) continue;

      const key = r.variant ? `v:${r.variant.id}` : `p:${p.id}`;
      const stock = r.variant ? r.variant.stock : p.stock;
      const rem = remaining.has(key) ? remaining.get(key) : stock;
      const qty = Math.min(l.qty, 99, rem);
      if (qty <= 0) continue;

      remaining.set(key, rem - qty);
      next.push({ id: l.id, qty, sel: l.sel || {} });
    }

    state.cart = next;
    saveCart();
  }

  // يرجّع true لو أُضيفت قطعة واحدة على الأقل
  function addToCart(id, sel = {}, qty = 1) {
    const product = productById.get(id);
    if (!product) return false;

    if (!selectionValid(product, sel)) {
      toast(t('toast.pickOptions'));
      return false;
    }

    const r = resolve(product, sel);
    if (!r.complete) {
      toast(t('toast.pickOptions'));
      return false;
    }

    if (r.unavailable || (r.variant ? r.variant.stock : product.stock) <= 0) {
      toast(t('toast.unavailable'));
      return false;
    }

    const key = lineKey(id, sel);
    const line = state.cart.find((l) => lineKey(l.id, l.sel) === key);
    const probe = line || { id, sel, qty: 0 };
    const max = lineMax(probe);
    const current = line ? line.qty : 0;

    if (current >= max) {
      toast(t('toast.max', { name: product.name, n: numFmt.format(max) }));
      return false;
    }

    const add = Math.min(qty, max - current);
    if (add < qty) toast(t('toast.max', { name: product.name, n: numFmt.format(max) }));

    if (line) line.qty += add;
    else state.cart.push({ id, qty: add, sel: { ...sel } });

    saveCart();
    renderCart(true);
    toast(t('toast.added', { name: product.name }));
    return true;
  }

  function changeQty(key, delta) {
    const line = state.cart.find((l) => lineKey(l.id, l.sel) === key);
    const product = line && productById.get(line.id);
    if (!line || !product) return;

    const max = lineMax(line);
    if (delta > 0 && line.qty >= max) {
      toast(t('toast.maxShort', { n: numFmt.format(max) }));
      return;
    }

    line.qty += delta;
    if (line.qty <= 0) return removeFromCart(key);
    saveCart();
    renderCart();
  }

  function removeFromCart(key) {
    state.cart = state.cart.filter((l) => lineKey(l.id, l.sel) !== key);
    saveCart();
    renderCart();
  }

  function clearCart() {
    state.cart = [];
    saveCart();
    renderCart();
  }

  // سطور السلة مع بياناتها المحسوبة
  function cartLines() {
    return state.cart
      .map((l) => {
        const product = productById.get(l.id);
        if (!product) return null;
        const r = resolve(product, l.sel || {});
        return { line: l, product, qty: l.qty, unit: finalPrice(product, r.price), r };
      })
      .filter(Boolean);
  }

  const optionsText = (product, sel) =>
    selLabels(product, sel).map((o) => `${o.group}: ${o.label}`).join(' · ');

  function renderCart(animateBadge = false) {
    const lines = cartLines();

    const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
    const totalPrice = lines.reduce((sum, l) => sum + l.qty * l.unit, 0);

    el.cartCount.textContent = numFmt.format(totalQty);
    el.cartCount.hidden = totalQty === 0;

    if (animateBadge) {
      el.cartCount.classList.remove('bump');
      void el.cartCount.offsetWidth;
      el.cartCount.classList.add('bump');
    }

    el.cartEmpty.hidden = lines.length > 0;
    el.cartFoot.hidden = lines.length === 0;

    el.cartItems.innerHTML = lines
      .map(({ line, product: p, qty, unit, r }) => {
        const key = escapeHTML(lineKey(line.id, line.sel));
        const opts = optionsText(p, line.sel);
        const linked = imageForSel(p, line.sel);
        const thumb = productMedia(p, 'c', linked || p.image);
        return `
          <li class="cart-item">
            <div class="cart-thumb">${thumb}</div>
            <div class="cart-info">
              <h3>${escapeHTML(p.name)}</h3>
              ${opts ? `<div class="cart-opts">${escapeHTML(opts)}</div>` : ''}
              <span class="cart-price">${money(unit)}</span>
              ${
                p.discount > 0
                  ? `<span class="old-price">${money(r.price)}</span>
                     <div class="muted">${escapeHTML(t('disc', { n: p.discount }))}</div>`
                  : ''
              }
              <div class="qty" role="group" aria-label="${escapeHTML(t('cartd.qty'))}">
                <button data-action="dec" data-key="${key}" aria-label="${escapeHTML(t('cartd.dec'))}">−</button>
                <span>${numFmt.format(qty)}</span>
                <button data-action="inc" data-key="${key}" aria-label="${escapeHTML(t('cartd.inc'))}">+</button>
              </div>
            </div>
            <div class="cart-side">
              <button class="remove" data-action="remove" data-key="${key}"
                aria-label="${escapeHTML(t('cartd.remove', { name: p.name }))}">🗑️</button>
              <strong>${money(unit * qty)}</strong>
            </div>
          </li>`;
      })
      .join('');

    el.cartTotal.textContent = money(totalPrice);
  }

  function openCart() {
    el.drawer.classList.add('open');
    el.overlay.classList.add('show');
    el.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.closeCart.focus(), 50);
  }

  function closeCart() {
    el.drawer.classList.remove('open');
    el.overlay.classList.remove('show');
    el.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    el.cartBtn.focus();
  }

  /* =============================================================
     نافذة تفاصيل المنتج: معرض صور + خيارات + سعر/مخزون التركيبة
     (تُنشأ بالـ JS حتى لا يحتاج index.html لأي تعديل)
     ============================================================= */
  const pd = { id: null, sel: {}, slide: 0, qty: 1, trigger: null, touchX: null };
  let pdModal = null;

  function buildProductModal() {
    pdModal = document.createElement('div');
    pdModal.className = 'pd-modal';
    pdModal.id = 'productModal';
    pdModal.hidden = true;
    pdModal.innerHTML = `
      <div class="pd-box" role="dialog" aria-modal="true" aria-labelledby="pdTitle">
        <button type="button" class="pd-close" id="pdClose">✕</button>
        <div class="pd-grid">
          <div class="pd-gallery">
            <div class="pd-main" id="pdMain">
              <div class="pd-slide" id="pdSlide"></div>
              <button type="button" class="pd-nav pd-nav-left" data-pd-nav="left">‹</button>
              <button type="button" class="pd-nav pd-nav-right" data-pd-nav="right">›</button>
            </div>
            <div class="pd-thumbs" id="pdThumbs"></div>
          </div>
          <div class="pd-info" id="pdInfo"></div>
        </div>
      </div>`;
    document.body.appendChild(pdModal);

    pdModal.addEventListener('click', onProductModalClick);
    pdModal.addEventListener('change', (e) => {
      const select = e.target.closest('select[data-pd-group]');
      if (select) selectOption(select.dataset.pdGroup, select.value);
    });

    const main = $('#pdMain', pdModal);
    main.addEventListener('touchstart', (e) => { pd.touchX = e.changedTouches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', (e) => {
      if (pd.touchX == null) return;
      const dx = e.changedTouches[0].clientX - pd.touchX;
      pd.touchX = null;
      if (Math.abs(dx) < 40) return;
      const rtl = document.documentElement.dir === 'rtl';
      // السحب لليسار يعرض التالي في LTR، والعكس في RTL
      step(dx < 0 ? (rtl ? -1 : 1) : (rtl ? 1 : -1));
    }, { passive: true });
  }

  const pdProduct = () => productById.get(pd.id) || null;

  function slidesFor(p) {
    return [
      { kind: p.image ? 'img' : 'svg', url: p.image, valueId: null },
      ...p.images.map((i) => ({ kind: 'img', url: i.url, valueId: i.valueId }))
    ];
  }

  function slideHTML(p, s, uid) {
    return s.kind === 'img' ? mediaHTML(p, s.url, uid) : mediaHTML(p, '', uid);
  }

  function step(dir) {
    const p = pdProduct();
    if (!p) return;
    const n = slidesFor(p).length;
    if (n < 2) return;
    pd.slide = (pd.slide + dir + n) % n;
    renderGallery();
  }

  function renderGallery() {
    const p = pdProduct();
    if (!p) return;

    const slides = slidesFor(p);
    if (pd.slide >= slides.length) pd.slide = 0;

    $('#pdSlide', pdModal).innerHTML = slideHTML(p, slides[pd.slide], `pd-${pd.slide}-${p.id}`);

    const multi = slides.length > 1;
    const rtl = document.documentElement.dir === 'rtl';
    $$('.pd-nav', pdModal).forEach((b) => {
      b.hidden = !multi;
      // الزر الأيسر فعليًا = "التالي" في RTL و"السابق" في LTR
      const next = (b.dataset.pdNav === 'left') === rtl;
      b.setAttribute('aria-label', t(next ? 'pd.next' : 'pd.prev'));
    });

    $('#pdThumbs', pdModal).innerHTML = multi
      ? slides
          .map(
            (s, i) => `
          <button type="button" class="pd-thumb ${i === pd.slide ? 'active' : ''}" data-pd-slide="${i}"
            aria-label="${escapeHTML(t('pd.slide', { n: numFmt.format(i + 1) }))}"
            aria-current="${i === pd.slide}">
            ${slideHTML(p, s, `pdt-${i}-${p.id}`)}
          </button>`
          )
          .join('')
      : '';
  }

  // هل توجد تركيبة متاحة تحتوي هذه القيمة مع باقي الاختيارات الحالية؟
  function valueAvailable(p, g, v) {
    if (p.mode !== 'variants') return true;
    const others = Object.entries(pd.sel)
      .filter(([gid]) => gid !== g.id)
      .map(([, vid]) => vid);
    for (const [key, variant] of p.variants) {
      if (variant.stock <= 0) continue;
      const ids = key.split(',');
      if (ids.includes(v.id) && others.every((o) => ids.includes(o))) return true;
    }
    return false;
  }

  function capacityLeft(p) {
    const r = resolve(p, pd.sel);
    if (!r.complete || r.unavailable) return 0;
    const key = lineKey(p.id, pd.sel);
    const line = state.cart.find((l) => lineKey(l.id, l.sel) === key);
    const probe = line || { id: p.id, sel: { ...pd.sel }, qty: 0 };
    return Math.max(0, lineMax(probe) - (line ? line.qty : 0));
  }

  function renderInfo() {
    const p = pdProduct();
    if (!p) return;

    // نحفظ العنصر المُركَّز لنعيده بعد إعادة الرسم
    const active = document.activeElement;
    const focusGroup = active && pdModal.contains(active) ? active.dataset.pdGroup : null;
    const focusValue = active && pdModal.contains(active) ? active.dataset.pdValue : null;

    const r = resolve(p, pd.sel);
    const range = priceRange(p);
    const showRange = p.mode === 'variants' && !r.complete && range.lo !== range.hi;
    const basePrice = showRange ? range.lo : r.price;
    const price = finalPrice(p, basePrice);

    // سطر المخزون
    let stockLine;
    if (p.mode === 'variants' && !r.complete) {
      stockLine = `<div class="stock">${escapeHTML(t('pd.pickForStock'))}</div>`;
    } else if (r.unavailable) {
      stockLine = `<div class="stock out">${escapeHTML(t('pd.unavailableCombo'))}</div>`;
    } else {
      const stock = p.mode === 'variants' ? r.stock : p.stock;
      stockLine =
        stock <= 0
          ? `<div class="stock out">${escapeHTML(t('stock.out'))}</div>`
          : `<div class="stock ${stock <= 5 ? 'low' : ''}">${escapeHTML(t('stock.available', { n: numFmt.format(stock) }))}</div>`;
    }

    // الخيارات
    const groupsHTML = p.groups
      .map((g) => {
        const required = g.required || p.mode === 'variants';
        const selId = pd.sel[g.id];
        const selValue = g.values.find((v) => v.id === selId);
        const head = `<div class="opt-label">${escapeHTML(g.name)}${required ? ' *' : ''}${
          selValue ? `: <b>${escapeHTML(selValue.label)}</b>` : ''
        }</div>`;

        if (g.type === 'select') {
          return `<div class="opt-group">${head}
            <select class="opt-select" data-pd-group="${escapeHTML(g.id)}">
              <option value="">${escapeHTML(t('pd.choose'))}</option>
              ${g.values
                .map(
                  (v) =>
                    `<option value="${escapeHTML(v.id)}" ${v.id === selId ? 'selected' : ''}>${escapeHTML(v.label)}${
                      valueAvailable(p, g, v) ? '' : ' ✕'
                    }</option>`
                )
                .join('')}
            </select></div>`;
        }

        const items = g.values
          .map((v) => {
            const cls = `${v.id === selId ? 'active' : ''} ${valueAvailable(p, g, v) ? '' : 'na'}`;
            const common = `data-pd-group="${escapeHTML(g.id)}" data-pd-value="${escapeHTML(v.id)}" aria-pressed="${v.id === selId}"`;
            if (g.type === 'color' && v.color) {
              return `<button type="button" class="opt-swatch ${cls}" style="--sw:${escapeHTML(v.color)}" ${common}
                title="${escapeHTML(v.label)}" aria-label="${escapeHTML(v.label)}"></button>`;
            }
            return `<button type="button" class="opt-btn ${cls}" ${common}>${escapeHTML(v.label)}</button>`;
          })
          .join('');
        return `<div class="opt-group">${head}<div class="opt-row" role="group" aria-label="${escapeHTML(g.name)}">${items}</div></div>`;
      })
      .join('');

    // الإضافة للسلة
    const soldOutAll = p.stock <= 0;
    const cap = capacityLeft(p);
    if (pd.qty > Math.max(cap, 1)) pd.qty = Math.max(cap, 1);
    if (pd.qty < 1) pd.qty = 1;

    let hint = '';
    if (soldOutAll) hint = t('stock.out');
    else if (!r.complete) hint = t('pd.pick', { names: r.missing.map((g) => g.name).join('، ') });
    else if (r.unavailable) hint = t('pd.unavailableCombo');
    else if (cap <= 0) hint = t('pd.maxInCart');

    const canAdd = !soldOutAll && r.complete && !r.unavailable && cap > 0;

    $('#pdInfo', pdModal).innerHTML = `
      <span class="card-cat">${escapeHTML(catLabel(p.category))}</span>
      <h2 class="pd-title" id="pdTitle">${escapeHTML(p.name)}</h2>
      <div class="price-row pd-price">
        ${showRange ? `<span class="price-from">${escapeHTML(t('card.from'))}</span>` : ''}
        <span class="price">${money(price)}</span>
        ${p.discount > 0 ? `<span class="old-price">${money(basePrice)}</span><span class="pd-off">${escapeHTML(t('badge.discount', { n: p.discount }))}</span>` : ''}
      </div>
      ${stockLine}
      ${p.description ? `<p class="pd-desc">${escapeHTML(p.description)}</p>` : ''}
      ${groupsHTML}
      <div class="pd-buy">
        <div class="qty" role="group" aria-label="${escapeHTML(t('cartd.qty'))}">
          <button type="button" data-pd-qty="-1" aria-label="${escapeHTML(t('cartd.dec'))}">−</button>
          <span>${numFmt.format(pd.qty)}</span>
          <button type="button" data-pd-qty="1" aria-label="${escapeHTML(t('cartd.inc'))}">+</button>
        </div>
        <button type="button" class="btn btn-primary pd-add" data-pd-add ${canAdd ? '' : 'disabled'}>${escapeHTML(t('card.add'))}</button>
      </div>
      <div class="pd-hint" role="status">${escapeHTML(hint)}</div>`;

    // إعادة التركيز
    if (focusGroup) {
      const sel = focusValue
        ? `[data-pd-group="${CSS.escape(focusGroup)}"][data-pd-value="${CSS.escape(focusValue)}"]`
        : `select[data-pd-group="${CSS.escape(focusGroup)}"]`;
      const node = $(sel, pdModal);
      if (node) node.focus();
    }
  }

  function renderProductModal() {
    if (!pdModal) return;
    $('#pdClose', pdModal).setAttribute('aria-label', t('pd.close'));
    renderGallery();
    renderInfo();
  }

  function selectOption(groupId, valueId) {
    const p = pdProduct();
    if (!p) return;
    const g = p.groups.find((x) => x.id === groupId);
    if (!g) return;
    const required = g.required || p.mode === 'variants';

    if (!valueId || (pd.sel[groupId] === valueId && !required)) {
      delete pd.sel[groupId];
    } else if (g.values.some((v) => v.id === valueId)) {
      pd.sel[groupId] = valueId;
      // لو للقيمة صورة مرتبطة، اعرضها (باقي الصور تظل متاحة في الشريط)
      const idx = slidesFor(p).findIndex((s) => s.valueId === valueId);
      if (idx >= 0) pd.slide = idx;
    }

    pd.qty = 1;
    renderGallery();
    renderInfo();
  }

  function openProduct(id) {
    const p = productById.get(id);
    if (!p) return;
    if (!pdModal) buildProductModal();

    pd.id = id;
    pd.sel = {};
    pd.slide = 0;
    pd.qty = 1;
    pd.trigger = document.activeElement;

    renderProductModal();
    pdModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#pdClose', pdModal).focus(), 30);
  }

  function closeProduct() {
    if (!pdModal || pdModal.hidden) return;
    pdModal.hidden = true;
    pd.id = null;
    if (el.checkoutModal.hidden && !el.drawer.classList.contains('open')) {
      document.body.style.overflow = '';
    }
    if (pd.trigger && document.contains(pd.trigger)) pd.trigger.focus();
    pd.trigger = null;
  }

  // بعد تحديث المخزون/اللغة: أعد رسم النافذة المفتوحة أو أغلقها لو اختفى المنتج
  function refreshProductModal() {
    if (!pdModal || pdModal.hidden) return;
    const p = pdProduct();
    if (!p) {
      closeProduct();
      return;
    }
    Object.keys(pd.sel).forEach((gid) => {
      const g = p.groups.find((x) => x.id === gid);
      if (!g || !g.values.some((v) => v.id === pd.sel[gid])) delete pd.sel[gid];
    });
    renderProductModal();
  }

  function onProductModalClick(e) {
    if (e.target === pdModal || e.target.closest('#pdClose')) {
      closeProduct();
      return;
    }

    const nav = e.target.closest('[data-pd-nav]');
    if (nav) {
      const rtl = document.documentElement.dir === 'rtl';
      const next = (nav.dataset.pdNav === 'left') === rtl;
      step(next ? 1 : -1);
      return;
    }

    const thumb = e.target.closest('[data-pd-slide]');
    if (thumb) {
      pd.slide = Number(thumb.dataset.pdSlide) || 0;
      renderGallery();
      return;
    }

    const opt = e.target.closest('button[data-pd-value]');
    if (opt) {
      selectOption(opt.dataset.pdGroup, opt.dataset.pdValue);
      return;
    }

    const qtyBtn = e.target.closest('[data-pd-qty]');
    if (qtyBtn) {
      const p = pdProduct();
      if (!p) return;
      const cap = Math.max(capacityLeft(p), 1);
      pd.qty = Math.max(1, Math.min(cap, pd.qty + Number(qtyBtn.dataset.pdQty)));
      renderInfo();
      return;
    }

    if (e.target.closest('[data-pd-add]')) {
      const p = pdProduct();
      if (!p) return;
      if (addToCart(p.id, { ...pd.sel }, pd.qty)) closeProduct();
      else renderInfo();
    }
  }

  /* ---------- إتمام الشراء (الدفع عند الاستلام + الشحن) ---------- */
  let placingOrder = false;

  // القيمة المرسلة للخادم = الاسم العربي دائمًا، والنص المعروض حسب اللغة
  function populateGovernorates() {
    const current = el.coGov.value;
    [...el.coGov.options].slice(1).forEach((o) => o.remove());
    el.coGov.insertAdjacentHTML(
      'beforeend',
      I18N.GOVERNORATES.map(
        (g) => `<option value="${escapeHTML(g.ar)}">${escapeHTML(I18N.govLabel(g.ar))}</option>`
      ).join('')
    );
    el.coGov.value = current;
  }

  const toLatinDigits = (s) =>
    String(s)
      .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632)
      .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776);

  function setCheckoutMessage(text) {
    el.coMsg.textContent = text || '';
  }

  function renderCheckoutSummary() {
    const lines = cartLines();
    const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unit, 0);
    const ship = shippingFor(el.coGov.value);
    const total = subtotal + (ship ?? 0);

    el.coSummary.innerHTML = `
      <ul class="co-lines">
        ${lines
          .map(({ product: p, qty, unit, line }) => {
            const opts = optionsText(p, line.sel);
            return `<li><span>${escapeHTML(p.name)} × ${numFmt.format(qty)}${
              opts ? `<small class="co-opts">${escapeHTML(opts)}</small>` : ''
            }</span>
                <strong>${money(unit * qty)}</strong></li>`;
          })
          .join('')}
      </ul>
      <div class="co-row"><span>${escapeHTML(t('co.subtotal'))}</span><strong>${money(subtotal)}</strong></div>
      <div class="co-row"><span>${escapeHTML(t('co.shipping'))}</span>
        <strong>${ship === null ? escapeHTML(t('co.shipPick')) : money(ship)}</strong></div>
      <div class="co-row co-total"><span>${escapeHTML(t('co.total'))}</span><strong>${money(total)}</strong></div>`;
  }

  async function openCheckout() {
    if (!state.cart.some((l) => productById.has(l.id))) {
      toast(t('toast.empty'));
      return;
    }

    closeCart();
    renderCheckoutSummary();
    setCheckoutMessage('');
    el.checkoutFormView.hidden = false;
    el.checkoutSuccess.hidden = true;
    el.checkoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.coName.focus(), 50);

    // تحديث المخزون وأسعار الشحن لحظة فتح النافذة
    await Promise.all([loadStore(true), fetchShippingRates()]);
    if (!el.checkoutModal.hidden && !lastOrder) {
      if (!state.cart.some((l) => productById.has(l.id))) {
        closeCheckoutModal();
        return;
      }
      renderCheckoutSummary();
    }
  }

  function closeCheckoutModal() {
    if (placingOrder) return;
    el.checkoutModal.hidden = true;
    document.body.style.overflow = '';
    lastOrder = null;
  }

  function renderSuccessText() {
    if (!lastOrder) return;
    el.successText.textContent = t('co.okText', {
      n: numFmt.format(lastOrder.n),
      total: money(lastOrder.total),
      phone: lastOrder.phone
    });
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (placingOrder) return;

    const name = el.coName.value.trim();
    const phone = toLatinDigits(el.coPhone.value).replace(/[\s-]/g, '');
    const governorate = el.coGov.value;
    const address = el.coAddress.value.trim();
    const notes = el.coNotes.value.trim();

    if (name.length < 3) return setCheckoutMessage(t('v.name'));
    if (!/^01[0125][0-9]{8}$/.test(phone)) return setCheckoutMessage(t('v.phone'));
    if (!governorate) return setCheckoutMessage(t('v.gov'));
    if (address.length < 8) return setCheckoutMessage(t('v.address'));

    // الاختيارات تُرسل كمعرّفات فقط؛ الخادم يتحقق منها ويحسب السعر والمخزون بنفسه
    const items = state.cart
      .filter((l) => productById.has(l.id))
      .map((l) => ({ id: l.id, qty: l.qty, options: l.sel || {} }));
    if (items.length === 0) return setCheckoutMessage(t('v.cartEmpty'));

    if (!window.supabaseClient) return setCheckoutMessage(t('v.noDb'));

    placingOrder = true;
    el.coSubmit.disabled = true;
    el.coSubmit.textContent = t('co.sending');
    setCheckoutMessage('');

    try {
      // لا يُرسل سعر الشحن: الخادم يحسبه من جدول shipping_rates
      const { data, error } = await window.supabaseClient.rpc('place_order', {
        p_name: name,
        p_phone: phone,
        p_governorate: governorate,
        p_address: address,
        p_notes: notes,
        p_items: items
      });

      if (error) throw error;

      clearCart();
      el.checkoutForm.reset();
      lastOrder = { n: data.order_number, total: data.total, phone };
      renderSuccessText();
      el.checkoutFormView.hidden = true;
      el.checkoutSuccess.hidden = false;
      loadStore(true);
    } catch (err) {
      console.error('Order error:', err);
      const msg = String(err && err.message ? err.message : '');
      const arabicMsg = /[\u0600-\u06FF]/.test(msg);
      setCheckoutMessage(I18N.getLang() === 'ar' && arabicMsg ? msg : t('v.orderFail'));
      loadStore(true);
    } finally {
      placingOrder = false;
      el.coSubmit.disabled = false;
      el.coSubmit.textContent = t('co.confirm');
    }
  }

  /* ---------- رسائل التنبيه ---------- */
  function toast(message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    el.toastZone.appendChild(node);

    setTimeout(() => {
      node.classList.add('out');
      node.addEventListener('animationend', () => node.remove(), { once: true });
    }, 2400);

    while (el.toastZone.children.length > 3) el.toastZone.firstChild.remove();
  }

  /* ---------- ظهور العناصر عند التمرير ---------- */
  let revealObserver = null;

  function observeReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach((n) => n.classList.add('visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
    }
    $$('.reveal:not(.visible)').forEach((n) => revealObserver.observe(n));
  }

  /* ---------- الأحداث ---------- */
  function closeMobileMenu() {
    el.mainNav.classList.remove('open');
    el.menuToggle.setAttribute('aria-expanded', 'false');
    el.menuToggle.textContent = '☰';
  }

  function bindEvents() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-category]');
      if (!trigger) return;
      if (trigger.tagName === 'A') e.preventDefault();
      setCategory(trigger.dataset.category, !trigger.classList.contains('chip'));
      closeMobileMenu();
    });

    const home = $('[data-nav="home"]');
    if (home) {
      home.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        closeMobileMenu();
      });
    }

    el.productGrid.addEventListener('click', (e) => {
      if (e.target.closest('[data-retry]')) {
        loadStore(false);
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) {
        openProduct(open.dataset.open);
        return;
      }
      const btn = e.target.closest('[data-add]');
      if (btn) addToCart(btn.dataset.add);
    });

    el.cartItems.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const key = btn.dataset.key;
      if (btn.dataset.action === 'inc') changeQty(key, 1);
      if (btn.dataset.action === 'dec') changeQty(key, -1);
      if (btn.dataset.action === 'remove') removeFromCart(key);
    });

    el.searchInput.addEventListener('input', () => {
      state.query = el.searchInput.value;
      renderProducts();
    });

    el.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.query = el.searchInput.value;
      renderProducts();
      $('#products').scrollIntoView({ behavior: 'smooth' });
    });

    el.sortSelect.addEventListener('change', () => {
      state.sort = el.sortSelect.value;
      renderProducts();
    });

    el.resetFilters.addEventListener('click', resetFilters);

    el.cartBtn.addEventListener('click', openCart);
    el.closeCart.addEventListener('click', closeCart);
    el.overlay.addEventListener('click', closeCart);

    el.clearCart.addEventListener('click', () => {
      clearCart();
      toast(t('toast.cleared'));
    });

    el.startShopping.addEventListener('click', () => {
      closeCart();
      $('#products').scrollIntoView({ behavior: 'smooth' });
    });

    // إتمام الشراء
    el.checkoutBtn.addEventListener('click', openCheckout);
    el.closeCheckout.addEventListener('click', closeCheckoutModal);
    el.successClose.addEventListener('click', () => {
      closeCheckoutModal();
      $('#products').scrollIntoView({ behavior: 'smooth' });
    });
    el.checkoutModal.addEventListener('click', (e) => {
      if (e.target === el.checkoutModal) closeCheckoutModal();
    });
    el.checkoutForm.addEventListener('submit', submitOrder);
    el.coGov.addEventListener('change', renderCheckoutSummary); // الإجمالي يتحدث فور تغيير المحافظة

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!el.checkoutModal.hidden) closeCheckoutModal();
        else if (pdModal && !pdModal.hidden) closeProduct();
        else if (el.drawer.classList.contains('open')) closeCart();
        closeMobileMenu();
        return;
      }
      if (pdModal && !pdModal.hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
        const rtl = document.documentElement.dir === 'rtl';
        const next = (e.key === 'ArrowLeft') === rtl;
        step(next ? 1 : -1);
      }
    });

    el.menuToggle.addEventListener('click', () => {
      const open = el.mainNav.classList.toggle('open');
      el.menuToggle.setAttribute('aria-expanded', String(open));
      el.menuToggle.textContent = open ? '✕' : '☰';
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt > 30000) {
        loadStore(true);
      }
    });

    // تغيير اللغة: إعادة رسم كل المحتوى الديناميكي
    window.addEventListener('langchange', () => {
      setFormatters();
      populateGovernorates();
      renderCategories();
      renderChips();
      renderProducts();
      renderCart();
      refreshProductModal();
      if (!el.checkoutModal.hidden) {
        if (lastOrder) renderSuccessText();
        else renderCheckoutSummary();
        setCheckoutMessage('');
      }
    });

    const onScroll = () =>
      el.header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- التشغيل ---------- */
  function init() {
    if (el.year) el.year.textContent = new Date().getFullYear();
    renderHero();
    renderChips();
    updateNavActive();
    renderCart();
    populateGovernorates();
    bindEvents();
    observeReveal();
    fetchShippingRates();
    loadStore();
  }

  init();
})();