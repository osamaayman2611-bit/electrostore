const ADMIN_UID = "a039da47-6ffa-4657-9414-1078423f4fe9";
const BUCKET = "products";
const IMAGE_LIMIT = 1024 * 1024;
const DEFAULT_SHIPPING = 80;
const MAX_GALLERY = 12;
const MAX_COMBOS = 200;
const MAX_GROUPS = 6;
const MAX_VALUES = 30;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const t = (key, vars) => I18N.t(key, vars);
const $ = id => document.getElementById(id);

const loginPanel = $("loginPanel");
const adminApp = $("adminApp");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const productList = $("productList");
const message = $("message");
const form = $("productForm");
const logoutBtn = $("logoutBtn");
const orderList = $("orderList");
const orderMessage = $("orderMessage");
const refreshOrders = $("refreshOrders");
const shippingGrid = $("shippingGrid");
const shippingMessage = $("shippingMessage");
const saveShipping = $("saveShipping");

const nameInput = $("name");
const priceInput = $("price");
const discountInput = $("discount");
const categoryInput = $("category");
const stockInput = $("stock");
const descriptionInput = $("description");
const imageInput = $("image");
const cancelEdit = $("cancelEdit");

// خيارات المنتج والصور الإضافية
const optBody = $("optBody");
const galleryInput = $("galleryInput");
const galleryMessage = $("galleryMessage");
const galleryList = $("galleryList");

let editingId = null;
let dbProducts = [];
let busy = false;
let loadedFor = null; // يمنع تحميل المنتجات مرتين لنفس المستخدم
let shippingDraft = {}; // اسم المحافظة (عربي) -> القيمة المكتوبة في الحقل

function showMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "#b91c1c" : "#15803d";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function getCategoryName(category) {
  const known = CATEGORIES.some(c => c.id === category);
  return known ? t("cat." + category + ".label") : category || "";
}

function money(value) {
  return Number(value || 0).toLocaleString(I18N.locale()) + " " + t("currency");
}

function svgDataURL(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function illustration(product) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const svg = typeof createIllustration === "function"
    ? createIllustration(
        product.category,
        String(product.id).replace(/[^a-zA-Z0-9_-]/g, ""),
        colors[0] || "#3b82f6",
        colors[1] || "#06b6d4",
        product.name || "Product"
      )
    : "";

  return svg ? svgDataURL(svg) : "";
}

// هل القيمة المخزنة مسار داخل الـ bucket (وليست رابطًا كاملًا)؟
function isStoragePath(value) {
  return Boolean(value) && !/^(data:|https?:\/\/)/i.test(String(value));
}

function publicUrl(path) {
  if (!path) return "";
  const { data } = window.supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

// الـ bucket عام (Public) فنستخدم الرابط العام مباشرة
function getImageURL(product) {
  if (product.image_url && /^https?:\/\//i.test(product.image_url)) {
    return product.image_url;
  }

  const stored = String(product.image || "").trim();

  if (/^(data:image\/|https?:\/\/)/i.test(stored)) return stored;

  if (stored) return publicUrl(stored);

  return "";
}

async function removeImage(path) {
  if (!isStoragePath(path)) return;
  try {
    const { error } = await window.supabaseClient.storage
      .from(BUCKET)
      .remove([path]);
    if (error) console.warn("Could not remove image from storage:", error.message);
  } catch (err) {
    console.warn("Could not remove image from storage:", err);
  }
}

async function removeImages(paths) {
  const list = (paths || []).filter(isStoragePath);
  if (!list.length) return;
  try {
    const { error } = await window.supabaseClient.storage.from(BUCKET).remove(list);
    if (error) console.warn("Could not remove images from storage:", error.message);
  } catch (err) {
    console.warn("Could not remove images from storage:", err);
  }
}

// لو فشل تحميل صورة نعرض الرسم التوضيحي بدلها
document.addEventListener("error", event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.pid || img.dataset.failed) return;

  img.dataset.failed = "1";
  const product = dbProducts.find(p => String(p.id) === img.dataset.pid);
  const fallback = product ? illustration(product) : "";
  if (fallback) img.src = fallback;
}, true);

function updateFormTexts() {
  const submit = form.querySelector('[type="submit"]');
  if (editingId !== null) {
    $("formTitle").textContent = t("a.form.edit");
    submit.textContent = t("a.f.saveEdit");
  } else {
    $("formTitle").textContent = t("a.form.add");
    submit.textContent = t("a.f.save");
  }
}

function resetForm() {
  form.reset();
  stockInput.value = "1";
  discountInput.value = "0";
  editingId = null;
  updateFormTexts();
  cancelEdit.hidden = true;
  resetOptions();
}

function productImageHTML(product) {
  const src = getImageURL(product) || illustration(product);

  if (!src) {
    return '<div style="width:65px;height:65px;display:grid;place-items:center;background:#e2e8f0;border-radius:10px">📦</div>';
  }

  return `<img src="${escapeHTML(src)}" alt="${escapeHTML(product.name || t("a.productImg"))}"
    data-pid="${escapeHTML(product.id)}"
    style="width:65px;height:65px;object-fit:contain;border-radius:10px">`;
}

function renderProductList() {
  $("productCount").textContent = dbProducts.length;

  if (!dbProducts.length) {
    productList.innerHTML = `<p class="empty">${escapeHTML(t("a.noProducts"))}</p>`;
    return;
  }

  productList.innerHTML = dbProducts.map(product => `
    <article class="product">
      <div class="product-image" style="width:65px;height:65px;flex-shrink:0">
        ${productImageHTML(product)}
      </div>
      <div class="product-info">
        <strong>${escapeHTML(product.name)}</strong>
        <span>${money(product.price)}</span>
        <div class="muted">${escapeHTML(t("a.cat", { v: getCategoryName(product.category) }))}</div>
        <div class="muted">${escapeHTML(t("a.qty", { v: Number(product.stock || 0) }))}</div>
        <div class="muted">${escapeHTML(t("a.disc", { v: Number(product.discount || 0) }))}</div>
        ${product.variant_mode && product.variant_mode !== "none"
          ? `<div class="muted">${escapeHTML(t("a.hasOpts"))}</div>` : ""}
      </div>
      <div class="product-actions">
        <button type="button" data-edit="${escapeHTML(product.id)}">${escapeHTML(t("a.edit"))}</button>
        <button type="button" class="danger" data-delete="${escapeHTML(product.id)}">${escapeHTML(t("a.delete"))}</button>
      </div>
    </article>
  `).join("");
}

async function loadProducts() {
  showMessage(t("a.loading"));

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  dbProducts = data || [];
  renderProductList();

  showMessage(dbProducts.length ? t("a.loaded", { n: dbProducts.length }) : t("a.noneFound"));
}

function showLogin(text = "") {
  adminApp.style.display = "none";
  loginPanel.style.display = "block";
  if (logoutBtn) logoutBtn.hidden = true;
  if (text) loginMessage.textContent = text;
  loadedFor = null;
}

async function checkAdmin() {
  const { data, error } = await window.supabaseClient.auth.getSession();

  if (error) {
    showLogin(t("a.checkFail"));
    return;
  }

  const user = data.session?.user;

  if (!user || user.id !== ADMIN_UID) {
    showLogin();
    return;
  }

  loginPanel.style.display = "none";
  adminApp.style.display = "block";
  if (logoutBtn) logoutBtn.hidden = false;

  if (loadedFor === user.id) return; // تم التحميل بالفعل
  loadedFor = user.id;

  try {
    await loadProducts();
  } catch (err) {
    loadedFor = null;
    showMessage(t("a.loadFail", { m: err.message }), true);
  }

  await loadOrdersSafe();
  await loadShippingSafe();
}

/* ---------- أسعار الشحن ---------- */
function showShippingMessage(text, error = false) {
  shippingMessage.textContent = text;
  shippingMessage.style.color = error ? "#b91c1c" : "#15803d";
}

function renderShipping() {
  shippingGrid.innerHTML = I18N.GOVERNORATES.map(g => {
    const v = shippingDraft[g.ar] ?? DEFAULT_SHIPPING;
    return `<label class="ship-item"><span>${escapeHTML(I18N.govLabel(g.ar))}</span>
      <input type="number" min="0" step="1" data-gov="${escapeHTML(g.ar)}" value="${escapeHTML(v)}"></label>`;
  }).join("");
}

async function loadShipping() {
  const { data, error } = await window.supabaseClient
    .from("shipping_rates")
    .select("governorate, cost");

  if (error) throw error;

  shippingDraft = {};
  I18N.GOVERNORATES.forEach(g => { shippingDraft[g.ar] = DEFAULT_SHIPPING; });
  (data || []).forEach(r => { shippingDraft[r.governorate] = Number(r.cost); });
  renderShipping();
}

async function loadShippingSafe() {
  try {
    await loadShipping();
  } catch (err) {
    I18N.GOVERNORATES.forEach(g => { shippingDraft[g.ar] = shippingDraft[g.ar] ?? DEFAULT_SHIPPING; });
    renderShipping();
    showShippingMessage(t("a.s.loadFail", { m: err.message }), true);
  }
}

shippingGrid.addEventListener("input", event => {
  const input = event.target.closest("[data-gov]");
  if (input) shippingDraft[input.dataset.gov] = input.value;
});

saveShipping.addEventListener("click", async () => {
  const rows = [];

  for (const g of I18N.GOVERNORATES) {
    const raw = shippingDraft[g.ar];
    const cost = Number(raw === "" ? NaN : raw);
    if (!Number.isFinite(cost) || cost < 0) {
      showShippingMessage(t("a.s.invalid"), true);
      return;
    }
    rows.push({ governorate: g.ar, cost, updated_at: new Date().toISOString() });
  }

  saveShipping.disabled = true;
  showShippingMessage(t("a.s.saving"));

  const { data, error } = await window.supabaseClient
    .from("shipping_rates")
    .upsert(rows, { onConflict: "governorate" })
    .select("governorate");

  saveShipping.disabled = false;

  if (error) {
    showShippingMessage(t("a.s.fail", { m: error.message }), true);
    return;
  }

  if (!data || data.length < rows.length) {
    showShippingMessage(t("a.s.none"), true);
    return;
  }

  showShippingMessage(t("a.s.saved"));
});

/* ---------- الطلبات ---------- */
// نفس القيم المسموحة في قيد orders_status_check في قاعدة البيانات
const ORDER_STATUS_KEYS = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];
const statusLabel = key => ORDER_STATUS_KEYS.includes(key) ? t("status." + key) : key;

let dbOrders = [];

function showOrderMessage(text, error = false) {
  orderMessage.textContent = text;
  orderMessage.style.color = error ? "#b91c1c" : "#15803d";
}

function orderHTML(order) {
  const items = (order.order_items || []).map(item => {
    const opts = Array.isArray(item.options) ? item.options : [];
    const optText = opts
      .map(o => `${escapeHTML(o.group)}: ${escapeHTML(o.value)}`)
      .join(" · ");
    return `
    <li>${escapeHTML(item.product_name)} × ${Number(item.quantity)}
      — ${money(Number(item.unit_price) * Number(item.quantity))}
      ${optText ? `<div class="muted order-opts">${optText}</div>` : ""}</li>
  `;
  }).join("");

  const phone = String(order.phone || "").replace(/[^0-9+]/g, "");
  const cancelled = order.status === "cancelled";

  const statusOptions = ORDER_STATUS_KEYS.map(value =>
    `<option value="${value}" ${value === order.status ? "selected" : ""}>${escapeHTML(statusLabel(value))}</option>`
  ).join("");

  const date = order.created_at
    ? new Date(order.created_at).toLocaleString(I18N.locale())
    : "";

  // الطلبات القديمة قد لا تحتوي shipping_cost (أو تساوي 0): لا نعرض السطر لها
  const shipping = Number(order.shipping_cost || 0);

  return `
    <article class="order">
      <div class="order-head">
        <strong>${escapeHTML(t("a.order", { n: Number(order.order_number) }))}</strong>
        <span class="muted">${escapeHTML(date)}</span>
        <span class="order-badge ${escapeHTML(order.status)}">
          ${escapeHTML(statusLabel(order.status))}
        </span>
      </div>
      <div>👤 ${escapeHTML(order.customer_name)} —
        <a href="tel:${escapeHTML(phone)}" dir="ltr">${escapeHTML(order.phone)}</a></div>
      <div>📍 ${escapeHTML(I18N.govLabel(order.governorate))} — ${escapeHTML(order.address)}</div>
      ${order.notes ? `<div>📝 ${escapeHTML(order.notes)}</div>` : ""}
      <ul>${items}</ul>
      ${shipping > 0 ? `<div>🚚 ${escapeHTML(t("a.ship", { v: money(shipping) }))}</div>` : ""}
      <div><strong>${escapeHTML(t("a.total", { v: money(order.total) }))}</strong>
        <span class="muted">${escapeHTML(t("a.cod"))}</span></div>
      <div class="order-actions">
        <select data-status-for="${escapeHTML(order.id)}" ${cancelled ? "disabled" : ""}>
          ${statusOptions}
        </select>
        <button type="button" data-save-status="${escapeHTML(order.id)}"
          ${cancelled ? "disabled" : ""}>${escapeHTML(t("a.saveStatus"))}</button>
      </div>
    </article>`;
}

function renderOrders() {
  $("orderCount").textContent = dbOrders.length;
  orderList.innerHTML = dbOrders.length
    ? dbOrders.map(orderHTML).join("")
    : `<p class="empty">${escapeHTML(t("a.ordersEmpty"))}</p>`;
}

async function loadOrders() {
  const { data, error } = await window.supabaseClient
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  dbOrders = data || [];
  renderOrders();
}

// يرجّع true عند النجاح
async function loadOrdersSafe() {
  try {
    await loadOrders();
    return true;
  } catch (err) {
    orderList.innerHTML = `<p class="empty">${escapeHTML(t("a.ordersFail"))}</p>`;
    showOrderMessage(t("a.ordersFailMsg", { m: err.message }), true);
    return false;
  }
}

refreshOrders.addEventListener("click", async () => {
  showOrderMessage(t("a.refreshing"));
  if (await loadOrdersSafe()) showOrderMessage(t("a.refreshed"));
});

orderList.addEventListener("click", async event => {
  const button = event.target.closest("[data-save-status]");
  if (!button) return;

  const id = button.dataset.saveStatus;
  const select = orderList.querySelector(
    `select[data-status-for="${CSS.escape(id)}"]`
  );
  const order = dbOrders.find(o => String(o.id) === id);

  if (!select || !order || select.value === order.status) return;

  if (select.value === "cancelled" && !confirm(t("a.confirmCancel"))) {
    select.value = order.status;
    return;
  }

  button.disabled = true;

  const { data, error } = await window.supabaseClient
    .from("orders")
    .update({ status: select.value })
    .eq("id", id)
    .select("id");

  button.disabled = false;

  if (error) {
    showOrderMessage(t("a.statusFail", { m: error.message }), true);
    return;
  }

  if (!data || data.length === 0) {
    showOrderMessage(t("a.statusNone"), true);
    return;
  }

  const wasCancelled = select.value === "cancelled";
  await loadOrdersSafe();
  if (wasCancelled) {
    try { await loadProducts(); } catch { /* تجاهل */ }
  }
  showOrderMessage(t("a.statusOk"));
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = t("a.loggingIn");

  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  const { data, error } = await window.supabaseClient.auth
    .signInWithPassword({ email, password });

  if (error) {
    loginMessage.textContent = t("a.loginFail");
    return;
  }

  if (data.user?.id !== ADMIN_UID) {
    await window.supabaseClient.auth.signOut();
    loginMessage.textContent = t("a.notAdmin");
    return;
  }

  loginMessage.textContent = "";
  await checkAdmin();
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await window.supabaseClient.auth.signOut();
    loginForm.reset();
    loginMessage.textContent = t("a.loggedOut");
    await checkAdmin();
  });
}

/* =============================================================
   رفع الصور
   ============================================================= */
async function uploadImage(file, productId, sub = "") {
  if (!file) return null;

  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error(t("a.v.imgType"));
  }

  if (file.size > IMAGE_LIMIT) {
    throw new Error(t("a.v.imgSize"));
  }

  const extension = ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  })[file.type];

  const folder = sub ? `${productId}/${sub}` : productId;
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await window.supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;
  return path;
}

/* =============================================================
   خيارات المنتج + التركيبات + الصور الإضافية (حالة المحرر)
   ============================================================= */
const uid = () => crypto.randomUUID();
const comboKey = ids => [...ids].sort().join(",");
const byPos = (a, b) => (a.position || 0) - (b.position || 0);

function freshOpt(loaded) {
  return {
    loaded,            // false = لا نلمس الخيارات والصور عند الحفظ
    loading: false,
    error: "",
    mode: "shared",    // shared | variants
    groups: [],        // [{id, name, type, required, values:[{id,label,color}]}]
    variantData: {},   // comboKey -> {id, price, stock, active}
    images: [],        // [{id, path, file, previewUrl, valueId}]
    originalPaths: []  // مسارات الصور المحفوظة وقت التحميل
  };
}

let opt = freshOpt(true);
let optToken = 0;

function releasePreviews() {
  opt.images.forEach(i => { if (i.file && i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
}

function resetOptions() {
  optToken++;
  releasePreviews();
  opt = freshOpt(true);
  setGalleryMessage("");
  renderOpt();
}

function setGalleryMessage(text, error = false) {
  if (!galleryMessage) return;
  galleryMessage.textContent = text;
  galleryMessage.style.color = error ? "#b91c1c" : "#15803d";
}

/* ---------- مجموعات وتركيبات ---------- */
function activeGroups() {
  return opt.groups
    .map(g => ({ ...g, values: g.values.filter(v => v.label.trim()) }))
    .filter(g => g.values.length > 0);
}

function comboCount() {
  const gs = activeGroups();
  if (!gs.length) return 0;
  return gs.reduce((n, g) => n * g.values.length, 1);
}

function comboList() {
  const gs = activeGroups();
  if (!gs.length || comboCount() > MAX_COMBOS) return [];
  let combos = [[]];
  for (const g of gs) {
    const next = [];
    for (const c of combos) for (const v of g.values) next.push([...c, v]);
    combos = next;
  }
  return combos.map(vals => ({
    key: comboKey(vals.map(v => v.id)),
    values: vals,
    label: vals.map(v => v.label.trim()).join(" / ")
  }));
}

function variantOf(key) {
  if (!opt.variantData[key]) {
    opt.variantData[key] = { id: null, price: "", stock: "", active: true };
  }
  return opt.variantData[key];
}

function variantsTotal() {
  if (opt.mode !== "variants") return 0;
  return comboList().reduce((sum, c) => {
    const d = variantOf(c.key);
    const n = Number(d.stock);
    return sum + (d.active !== false && d.stock !== "" && Number.isInteger(n) && n > 0 ? n : 0);
  }, 0);
}

function variantsMode() {
  return opt.loaded && opt.mode === "variants" && activeGroups().length > 0;
}

// في وضع التركيبات: الكمية الأساسية = مجموع مخزون التركيبات (للقراءة فقط)
function syncStockField() {
  const on = variantsMode();
  stockInput.disabled = on;
  if (on) stockInput.value = String(variantsTotal());
}

/* ---------- رسم محرر الخيارات ---------- */
function groupsHTML() {
  const isVariants = opt.mode === "variants";
  if (!opt.groups.length) return "";

  return opt.groups.map(g => `
    <div class="og" data-gid="${escapeHTML(g.id)}">
      <div class="og-head">
        <input class="g-name" data-gid="${escapeHTML(g.id)}" value="${escapeHTML(g.name)}"
          maxlength="50" placeholder="${escapeHTML(t("a.o.groupName"))}">
        <select class="g-type" data-gid="${escapeHTML(g.id)}">
          ${["color", "buttons", "select"].map(ty =>
            `<option value="${ty}" ${g.type === ty ? "selected" : ""}>${escapeHTML(t("a.o.type." + ty))}</option>`
          ).join("")}
        </select>
        <label class="chk">
          <input type="checkbox" class="g-req" data-gid="${escapeHTML(g.id)}"
            ${g.required || isVariants ? "checked" : ""} ${isVariants ? "disabled" : ""}>
          ${escapeHTML(t("a.o.required"))}
        </label>
        <button type="button" class="danger" data-del-group="${escapeHTML(g.id)}">${escapeHTML(t("a.o.delGroup"))}</button>
      </div>
      <div class="og-values">
        ${g.values.map(v => `
          <div class="og-row">
            ${g.type === "color"
              ? `<input type="color" class="v-color" data-gid="${escapeHTML(g.id)}" data-vid="${escapeHTML(v.id)}" value="${escapeHTML(v.color || "#6b7280")}">`
              : ""}
            <input class="v-label" data-gid="${escapeHTML(g.id)}" data-vid="${escapeHTML(v.id)}"
              value="${escapeHTML(v.label)}" maxlength="50" placeholder="${escapeHTML(t("a.o.valuePh"))}">
            <button type="button" data-del-value="${escapeHTML(g.id)}|${escapeHTML(v.id)}"
              aria-label="${escapeHTML(t("a.o.delValue"))}">✕</button>
          </div>`).join("")}
      </div>
      <button type="button" data-add-value="${escapeHTML(g.id)}">${escapeHTML(t("a.o.addValue"))}</button>
    </div>`).join("");
}

function modeHTML() {
  if (!activeGroups().length) return "";
  return `
    <div class="og-mode">
      <strong>${escapeHTML(t("a.o.modeTitle"))}</strong>
      <label class="chk"><input type="radio" name="optMode" value="shared" ${opt.mode !== "variants" ? "checked" : ""}>
        ${escapeHTML(t("a.o.modeShared"))}</label>
      <label class="chk"><input type="radio" name="optMode" value="variants" ${opt.mode === "variants" ? "checked" : ""}>
        ${escapeHTML(t("a.o.modeVariants"))}</label>
    </div>`;
}

function variantsHTML() {
  if (opt.mode !== "variants" || !activeGroups().length) return "";

  const count = comboCount();
  if (count > MAX_COMBOS) {
    return `<p class="opt-error">${escapeHTML(t("a.o.tooMany", { n: count }))}</p>`;
  }

  const base = priceInput.value || "";
  const rows = comboList().map(c => {
    const d = variantOf(c.key);
    const key = escapeHTML(c.key);
    return `
      <tr>
        <td>${escapeHTML(c.label)}</td>
        <td><input type="number" class="vt-price" data-vkey="${key}" min="0" step="0.01"
              value="${escapeHTML(d.price)}" placeholder="${escapeHTML(base)}"></td>
        <td><input type="number" class="vt-stock" data-vkey="${key}" min="0" step="1"
              value="${escapeHTML(d.stock)}" placeholder="0"></td>
        <td><input type="checkbox" class="vt-active" data-vkey="${key}" ${d.active !== false ? "checked" : ""}></td>
      </tr>`;
  }).join("");

  return `
    <div class="og-variants">
      <strong>${escapeHTML(t("a.o.variantsTitle"))} (${count})</strong>
      <p class="muted">${escapeHTML(t("a.o.variantsHelp"))}</p>
      <div class="og-bulk">
        <span>${escapeHTML(t("a.o.bulk"))}</span>
        <input type="number" id="bulkPrice" min="0" step="0.01" placeholder="${escapeHTML(t("a.o.colPrice"))}">
        <input type="number" id="bulkStock" min="0" step="1" placeholder="${escapeHTML(t("a.o.colStock"))}">
        <button type="button" data-bulk-apply>${escapeHTML(t("a.o.apply"))}</button>
      </div>
      <div class="vt-wrap">
        <table class="vt">
          <thead><tr>
            <th>${escapeHTML(t("a.o.colCombo"))}</th>
            <th>${escapeHTML(t("a.o.colPrice"))}</th>
            <th>${escapeHTML(t("a.o.colStock"))}</th>
            <th>${escapeHTML(t("a.o.colActive"))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="muted" id="vtTotal">${escapeHTML(t("a.o.totalStock", { n: variantsTotal() }))}</p>
    </div>`;
}

function renderDerived() {
  const modeBox = $("modeBox");
  const variantBox = $("variantBox");
  if (modeBox) modeBox.innerHTML = modeHTML();
  if (variantBox) variantBox.innerHTML = variantsHTML();
  refreshGalleryLinks();
  syncStockField();
}

function renderOpt() {
  if (!optBody) return;

  if (opt.loading) {
    optBody.innerHTML = `<p class="muted">${escapeHTML(t("a.o.loading"))}</p>`;
    renderGallery();
    return;
  }

  if (!opt.loaded) {
    optBody.innerHTML = `<p class="opt-error">${escapeHTML(t("a.o.loadFail", { m: opt.error }))}</p>`;
    renderGallery();
    syncStockField();
    return;
  }

  optBody.innerHTML = `
    <div class="og-presets">
      <button type="button" data-preset="color">${escapeHTML(t("a.o.addColor"))}</button>
      <button type="button" data-preset="size">${escapeHTML(t("a.o.addSize"))}</button>
      <button type="button" data-preset="cap">${escapeHTML(t("a.o.addCap"))}</button>
      <button type="button" data-preset="custom">${escapeHTML(t("a.o.addCustom"))}</button>
    </div>
    <div id="groupList">${groupsHTML()}</div>
    <div id="modeBox">${modeHTML()}</div>
    <div id="variantBox">${variantsHTML()}</div>`;

  renderGallery();
  syncStockField();
}

/* ---------- عمليات المحرر ---------- */
function addPreset(kind) {
  if (opt.groups.length >= MAX_GROUPS) {
    showMessage(t("a.o.maxGroups", { n: MAX_GROUPS }), true);
    return;
  }

  const defs = {
    color: {
      name: t("a.o.nameColor"), type: "color",
      values: [["أسود", "#111827"], ["أبيض", "#ffffff"], ["أزرق", "#2563eb"]]
    },
    size: {
      name: t("a.o.nameSize"), type: "buttons",
      values: [["S"], ["M"], ["L"], ["XL"]]
    },
    cap: {
      name: t("a.o.nameCap"), type: "buttons",
      values: [["128GB"], ["256GB"], ["512GB"]]
    },
    custom: { name: "", type: "buttons", values: [[""]] }
  };

  const def = defs[kind];
  if (!def) return;

  opt.groups.push({
    id: uid(),
    name: def.name,
    type: def.type,
    required: false,
    values: def.values.map(([label, color]) => ({ id: uid(), label, color: color || "#6b7280" }))
  });
  renderOpt();
}

function unlinkImages(valueIds) {
  const set = new Set(valueIds);
  opt.images.forEach(i => { if (set.has(i.valueId)) i.valueId = ""; });
}

function removeGroup(gid) {
  const g = opt.groups.find(x => x.id === gid);
  if (!g) return;
  unlinkImages(g.values.map(v => v.id));
  opt.groups = opt.groups.filter(x => x.id !== gid);
  renderOpt();
}

function addValue(gid) {
  const g = opt.groups.find(x => x.id === gid);
  if (!g) return;
  if (g.values.length >= MAX_VALUES) {
    showMessage(t("a.o.maxValues", { n: MAX_VALUES }), true);
    return;
  }
  const v = { id: uid(), label: "", color: "#6b7280" };
  g.values.push(v);
  renderOpt();
  const input = optBody.querySelector(`.v-label[data-vid="${CSS.escape(v.id)}"]`);
  if (input) input.focus();
}

function removeValue(gid, vid) {
  const g = opt.groups.find(x => x.id === gid);
  if (!g) return;
  unlinkImages([vid]);
  g.values = g.values.filter(v => v.id !== vid);
  renderOpt();
}

function applyBulk() {
  const price = $("bulkPrice").value.trim();
  const stock = $("bulkStock").value.trim();
  comboList().forEach(c => {
    const d = variantOf(c.key);
    if (price !== "") d.price = price;
    if (stock !== "") d.stock = stock;
  });
  renderDerived();
}

if (optBody) {
  optBody.addEventListener("click", event => {
    const el = event.target;
    const preset = el.closest("[data-preset]");
    if (preset) return addPreset(preset.dataset.preset);

    const delGroup = el.closest("[data-del-group]");
    if (delGroup) return removeGroup(delGroup.dataset.delGroup);

    const addVal = el.closest("[data-add-value]");
    if (addVal) return addValue(addVal.dataset.addValue);

    const delVal = el.closest("[data-del-value]");
    if (delVal) {
      const [gid, vid] = delVal.dataset.delValue.split("|");
      return removeValue(gid, vid);
    }

    if (el.closest("[data-bulk-apply]")) applyBulk();
  });

  optBody.addEventListener("input", event => {
    const el = event.target;

    if (el.classList.contains("g-name")) {
      const g = opt.groups.find(x => x.id === el.dataset.gid);
      if (g) { g.name = el.value; renderDerived(); }
      return;
    }

    if (el.classList.contains("v-label") || el.classList.contains("v-color")) {
      const g = opt.groups.find(x => x.id === el.dataset.gid);
      const v = g && g.values.find(x => x.id === el.dataset.vid);
      if (!v) return;
      if (el.classList.contains("v-label")) { v.label = el.value; renderDerived(); }
      else v.color = el.value;
      return;
    }

    if (el.classList.contains("vt-price") || el.classList.contains("vt-stock")) {
      const d = variantOf(el.dataset.vkey);
      if (el.classList.contains("vt-price")) d.price = el.value;
      else d.stock = el.value;
      updateVariantTotals();
    }
  });

  optBody.addEventListener("change", event => {
    const el = event.target;

    if (el.classList.contains("g-type")) {
      const g = opt.groups.find(x => x.id === el.dataset.gid);
      if (g) { g.type = el.value; renderOpt(); }
      return;
    }

    if (el.classList.contains("g-req")) {
      const g = opt.groups.find(x => x.id === el.dataset.gid);
      if (g) g.required = el.checked;
      return;
    }

    if (el.name === "optMode") {
      opt.mode = el.value === "variants" ? "variants" : "shared";
      renderOpt();
      return;
    }

    if (el.classList.contains("vt-active")) {
      variantOf(el.dataset.vkey).active = el.checked;
      updateVariantTotals();
    }
  });
}

function updateVariantTotals() {
  const total = $("vtTotal");
  if (total) total.textContent = t("a.o.totalStock", { n: variantsTotal() });
  syncStockField();
}

// تغيير سعر المنتج الأساسي يحدّث نص التلميح في جدول التركيبات
priceInput.addEventListener("input", () => {
  if (variantsMode()) {
    $$vt().forEach(inp => { inp.placeholder = priceInput.value || ""; });
  }
});
function $$vt() {
  return [...document.querySelectorAll("input.vt-price")];
}

/* ---------- الصور الإضافية ---------- */
function linkOptionsHTML(selectedId) {
  const out = [`<option value="">${escapeHTML(t("a.g.noLink"))}</option>`];
  opt.groups.forEach(g => {
    g.values.forEach(v => {
      const label = v.label.trim();
      if (!label) return;
      out.push(
        `<option value="${escapeHTML(v.id)}" ${v.id === selectedId ? "selected" : ""}>${escapeHTML((g.name.trim() || "…") + ": " + label)}</option>`
      );
    });
  });
  return out.join("");
}

function refreshGalleryLinks() {
  if (!galleryList) return;
  galleryList.querySelectorAll("select[data-img-link]").forEach(sel => {
    const img = opt.images.find(i => i.id === sel.dataset.imgLink);
    sel.innerHTML = linkOptionsHTML(img ? img.valueId : "");
  });
}

function renderGallery() {
  if (!galleryList) return;

  galleryInput.disabled = !opt.loaded || opt.loading;

  if (!opt.loaded) {
    galleryList.innerHTML = "";
    return;
  }

  if (!opt.images.length) {
    galleryList.innerHTML = `<p class="empty">${escapeHTML(t("a.g.empty"))}</p>`;
    return;
  }

  galleryList.innerHTML = opt.images.map((img, i) => `
    <div class="gl-row">
      <img src="${escapeHTML(img.previewUrl)}" alt="">
      <div class="gl-meta">
        <span class="muted">${escapeHTML(img.file ? t("a.g.new") : t("a.g.saved"))}</span>
        <label class="gl-link">${escapeHTML(t("a.g.link"))}
          <select data-img-link="${escapeHTML(img.id)}">${linkOptionsHTML(img.valueId)}</select>
        </label>
      </div>
      <div class="gl-actions">
        <button type="button" data-img-up="${escapeHTML(img.id)}" ${i === 0 ? "disabled" : ""}
          aria-label="${escapeHTML(t("a.g.up"))}">▲</button>
        <button type="button" data-img-down="${escapeHTML(img.id)}" ${i === opt.images.length - 1 ? "disabled" : ""}
          aria-label="${escapeHTML(t("a.g.down"))}">▼</button>
        <button type="button" class="danger" data-img-del="${escapeHTML(img.id)}"
          aria-label="${escapeHTML(t("a.g.remove"))}">✕</button>
      </div>
    </div>`).join("");
}

if (galleryInput) {
  galleryInput.addEventListener("change", () => {
    const files = [...galleryInput.files];
    galleryInput.value = "";

    const errors = [];
    let added = 0;

    for (const file of files) {
      if (opt.images.length >= MAX_GALLERY) {
        errors.push(t("a.g.tooMany", { n: MAX_GALLERY }));
        break;
      }
      if (!IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t("a.v.imgType")}`);
        continue;
      }
      if (file.size > IMAGE_LIMIT) {
        errors.push(`${file.name}: ${t("a.v.imgSize")}`);
        continue;
      }
      opt.images.push({ id: uid(), path: "", file, previewUrl: URL.createObjectURL(file), valueId: "" });
      added++;
    }

    if (errors.length) setGalleryMessage(errors.join(" — "), true);
    else setGalleryMessage(added ? t("a.g.added", { n: added }) : "");

    renderGallery();
  });

  galleryList.addEventListener("change", event => {
    const sel = event.target.closest("select[data-img-link]");
    if (!sel) return;
    const img = opt.images.find(i => i.id === sel.dataset.imgLink);
    if (img) img.valueId = sel.value;
  });

  galleryList.addEventListener("click", event => {
    const up = event.target.closest("[data-img-up]");
    const down = event.target.closest("[data-img-down]");
    const del = event.target.closest("[data-img-del]");

    const move = (id, delta) => {
      const i = opt.images.findIndex(x => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= opt.images.length) return;
      [opt.images[i], opt.images[j]] = [opt.images[j], opt.images[i]];
      renderGallery();
    };

    if (up) return move(up.dataset.imgUp, -1);
    if (down) return move(down.dataset.imgDown, 1);

    if (del) {
      const img = opt.images.find(x => x.id === del.dataset.imgDel);
      if (img && img.file && img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      opt.images = opt.images.filter(x => x.id !== del.dataset.imgDel);
      setGalleryMessage("");
      renderGallery();
    }
  });
}

/* ---------- تحميل خيارات منتج موجود ---------- */
async function loadOptionsFor(productId) {
  const token = ++optToken;
  releasePreviews();
  opt = freshOpt(false);
  opt.loading = true;
  renderOpt();

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("variant_mode, product_option_groups(*, product_option_values(*)), product_variants(*), product_images(*)")
    .eq("id", productId)
    .maybeSingle();

  if (token !== optToken) return; // المستخدم انتقل لمنتج آخر

  opt.loading = false;

  if (error || !data) {
    opt.error = error ? error.message : "";
    renderOpt();
    return;
  }

  opt.groups = (data.product_option_groups || []).slice().sort(byPos).map(g => ({
    id: g.id,
    name: g.name,
    type: ["color", "buttons", "select"].includes(g.type) ? g.type : "buttons",
    required: !!g.required,
    values: (g.product_option_values || []).slice().sort(byPos).map(v => ({
      id: v.id, label: v.label, color: v.color_hex || "#6b7280"
    }))
  }));

  opt.mode = data.variant_mode === "variants" && opt.groups.length ? "variants" : "shared";

  (data.product_variants || []).forEach(v => {
    opt.variantData[v.combo_key] = {
      id: v.id,
      price: v.price == null ? "" : String(v.price),
      stock: String(v.stock),
      active: v.is_active !== false
    };
  });

  opt.images = (data.product_images || []).slice().sort(byPos).map(i => ({
    id: i.id, path: i.path, file: null, previewUrl: publicUrl(i.path), valueId: i.option_value_id || ""
  }));
  opt.originalPaths = opt.images.map(i => i.path);

  opt.loaded = true;
  renderOpt();
}

/* ---------- التحقق وبناء البيانات للحفظ ---------- */
function validateOptions() {
  const groupNames = new Set();

  for (const g of opt.groups) {
    const name = g.name.trim();
    const labels = g.values.map(v => v.label.trim()).filter(Boolean);

    if (!name && !labels.length) continue; // صف فاضي: يُتجاهل
    if (!name) throw new Error(t("a.o.v.groupName"));
    if (!labels.length) throw new Error(t("a.o.v.groupEmpty", { g: name }));

    const nameKey = name.toLowerCase();
    if (groupNames.has(nameKey)) throw new Error(t("a.o.v.groupDup", { g: name }));
    groupNames.add(nameKey);

    const seen = new Set();
    for (const label of labels) {
      const k = label.toLowerCase();
      if (seen.has(k)) throw new Error(t("a.o.v.valueDup", { v: label, g: name }));
      seen.add(k);
    }
  }

  if (opt.mode === "variants" && activeGroups().length) {
    const count = comboCount();
    if (count > MAX_COMBOS) throw new Error(t("a.o.tooMany", { n: count }));

    for (const c of comboList()) {
      const d = variantOf(c.key);
      const stockNum = Number(d.stock);
      if (d.stock === "" || !Number.isInteger(stockNum) || stockNum < 0) {
        throw new Error(t("a.o.v.variantStock", { c: c.label }));
      }
      if (d.price !== "" && (!Number.isFinite(Number(d.price)) || Number(d.price) < 0)) {
        throw new Error(t("a.o.v.variantPrice", { c: c.label }));
      }
    }
  }
}

function buildOptionsPayload(productId, uploadedByImageId) {
  const gs = activeGroups().map(g => ({
    id: g.id,
    name: g.name.trim(),
    type: g.type,
    required: opt.mode === "variants" ? true : !!g.required,
    values: g.values.map(v => ({
      id: v.id,
      label: v.label.trim(),
      color: g.type === "color" ? v.color : null
    }))
  }));

  const mode = gs.length ? opt.mode : "none";
  const validValues = new Set(gs.flatMap(g => g.values.map(v => v.id)));

  const variants = [];
  if (mode === "variants") {
    comboList().forEach(c => {
      const d = variantOf(c.key);
      variants.push({
        id: d.id || uid(),
        value_ids: c.values.map(v => v.id),
        price: d.price === "" ? null : Number(d.price),
        stock: Number(d.stock),
        active: d.active !== false
      });
    });
  }

  const images = opt.images.map(i => ({
    id: i.id,
    path: i.file ? uploadedByImageId[i.id] : i.path,
    value_id: validValues.has(i.valueId) ? i.valueId : null
  }));

  return {
    p_product_id: productId,
    p_mode: mode,
    p_groups: gs,
    p_variants: variants,
    p_images: images
  };
}

/* =============================================================
   قائمة المنتجات: تعديل / حذف
   ============================================================= */
productList.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const product = dbProducts.find(
      p => String(p.id) === editButton.dataset.edit
    );
    if (!product) return;

    editingId = product.id;
    nameInput.value = product.name || "";
    priceInput.value = product.price ?? "";
    discountInput.value = product.discount ?? 0;
    categoryInput.value = product.category || "phones";
    stockInput.value = product.stock ?? 0;
    descriptionInput.value = product.description || "";
    imageInput.value = "";

    updateFormTexts();
    cancelEdit.hidden = false;
    showMessage(t("a.editHint"));
    window.scrollTo({ top: 0, behavior: "smooth" });

    loadOptionsFor(String(product.id));
    return;
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;
    const product = dbProducts.find(p => String(p.id) === id);
    if (!product || !confirm(t("a.confirmDel", { name: product.name }))) return;

    // مسارات الصور الإضافية قبل الحذف (الحذف يمسح صفوفها تلقائيًا)
    let galleryPaths = [];
    try {
      const { data } = await window.supabaseClient
        .from("product_images")
        .select("path")
        .eq("product_id", id);
      galleryPaths = (data || []).map(r => r.path);
    } catch { /* الجدول قد لا يكون موجودًا بعد */ }

    const { data: deleted, error } = await window.supabaseClient
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      showMessage(t("a.delFail", { m: error.message }), true);
      return;
    }

    if (!deleted || deleted.length === 0) {
      showMessage(t("a.delNone"), true);
      return;
    }

    // حذف صور المنتج من التخزين حتى لا تتراكم ملفات غير مستخدمة
    await removeImage(product.image);
    await removeImages(galleryPaths);

    if (String(editingId) === id) resetForm();

    try {
      await loadProducts();
      showMessage(t("a.deleted"));
    } catch (err) {
      showMessage(t("a.deletedStale", { m: err.message }), true);
    }
  }
});

/* =============================================================
   حفظ المنتج (إضافة / تعديل) + الخيارات + الصور الإضافية
   ============================================================= */
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;

  busy = true;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;

  let uploadedPath = null;          // الصورة الرئيسية الجديدة
  const uploadedGallery = [];       // [{imgId, path}] صور إضافية جديدة
  let optionsError = null;
  let productId = null;
  const wasEditing = editingId !== null;
  const optionsActive = opt.loaded && !opt.loading;

  try {
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const discount = Number(discountInput.value);
    const description = descriptionInput.value.trim();

    if (!name || !Number.isFinite(price) || price <= 0) {
      throw new Error(t("a.v.nameprice"));
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > 99) {
      throw new Error(t("a.v.discount"));
    }

    if (optionsActive) validateOptions();

    // في وضع التركيبات: الكمية = مجموع مخزون التركيبات
    const stock = optionsActive && variantsMode()
      ? variantsTotal()
      : Number(stockInput.value);

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(t("a.v.stock"));
    }

    const file = imageInput.files?.[0] || null;
    const existing = wasEditing
      ? dbProducts.find(p => String(p.id) === String(editingId))
      : null;

    if (wasEditing && !existing) {
      throw new Error(t("a.v.missing"));
    }

    productId = wasEditing
      ? String(editingId)
      : crypto.randomUUID();

    let imagePath = existing?.image || null;

    if (file) {
      uploadedPath = await uploadImage(file, productId);
      imagePath = uploadedPath;
    }

    // رفع الصور الإضافية الجديدة فقط (القديمة لا تُلمس)
    const newImages = optionsActive ? opt.images.filter(i => i.file) : [];
    for (let i = 0; i < newImages.length; i++) {
      showMessage(t("a.g.uploading", { i: i + 1, n: newImages.length }));
      const path = await uploadImage(newImages[i].file, productId, "gallery");
      uploadedGallery.push({ imgId: newImages[i].id, path });
    }

    const payload = {
      name,
      description,
      price,
      discount,
      category: categoryInput.value,
      stock,
      is_active: true,
      image: imagePath || "",
      image_url: null
    };

    if (existing) {
      // الحفاظ على بيانات المنتج الأخرى عند التعديل.
      payload.old_price = existing.old_price ?? null;
      payload.rating = existing.rating ?? 0;
      payload.reviews = existing.reviews ?? 0;
      payload.badge = existing.badge ?? null;
      payload.colors = existing.colors ?? [];
    } else {
      payload.id = productId;
      payload.rating = 0;
      payload.reviews = 0;
      payload.colors = [];
    }

    const query = wasEditing
      ? window.supabaseClient.from("products").update(payload).eq("id", editingId).select("id")
      : window.supabaseClient.from("products").insert(payload).select("id");

    const { data: saved, error } = await query;

    if (error) {
      // فشل الحفظ: احذف الصور التي رُفعت للتو حتى لا تبقى يتيمة
      if (uploadedPath) await removeImage(uploadedPath);
      await removeImages(uploadedGallery.map(u => u.path));
      throw error;
    }

    // مع RLS قد ترفض القاعدة الكتابة بدون خطأ (0 صفوف تأثرت)
    if (!saved || saved.length === 0) {
      if (uploadedPath) await removeImage(uploadedPath);
      await removeImages(uploadedGallery.map(u => u.path));
      throw new Error(t("a.saveNone"));
    }

    // نجح حفظ المنتج: احذف الصورة الرئيسية القديمة بعد استبدالها
    if (uploadedPath && existing?.image && existing.image !== uploadedPath) {
      await removeImage(existing.image);
    }

    // حفظ الخيارات والتركيبات والصور الإضافية في عملية واحدة ذرّية
    if (optionsActive) {
      try {
        const mapping = Object.fromEntries(uploadedGallery.map(u => [u.imgId, u.path]));
        const { error: rpcError } = await window.supabaseClient
          .rpc("admin_save_product_options", buildOptionsPayload(productId, mapping));
        if (rpcError) throw rpcError;

        // نجح: احذف من التخزين الصور التي أزلتها فقط
        const kept = new Set(opt.images.filter(i => !i.file).map(i => i.path));
        await removeImages(opt.originalPaths.filter(p => !kept.has(p)));
      } catch (rpcErr) {
        // لم يُحفظ شيء في الجداول: احذف الملفات التي رُفعت للتو
        await removeImages(uploadedGallery.map(u => u.path));
        optionsError = rpcErr;
      }
    }

    if (optionsError) {
      // المنتج نفسه اتحفظ: نبقى في وضع التعديل ليعيد المحاولة بدون تكرار المنتج
      editingId = productId;
      updateFormTexts();
      cancelEdit.hidden = false;
      imageInput.value = "";
      await loadProducts();
      showMessage(t("a.o.fail", { m: optionsError.message }), true);
      return;
    }

    resetForm();
    await loadProducts();
    showMessage(
      wasEditing
        ? t("a.updated") + (optionsActive ? "" : " " + t("a.o.skipped"))
        : t("a.saved")
    );
  } catch (err) {
    showMessage(t("a.saveFail", { m: err.message }), true);
  } finally {
    busy = false;
    submitButton.disabled = false;
  }
});

cancelEdit.addEventListener("click", () => {
  resetForm();
  showMessage(t("a.canceled"));
});

// تغيير اللغة: إعادة رسم القوائم من البيانات المحفوظة دون إعادة جلبها
window.addEventListener("langchange", () => {
  updateFormTexts();
  renderProductList();
  renderOrders();
  renderShipping();
  renderOpt();
});

renderOpt();

if (!window.supabaseClient) {
  loginPanel.style.display = "block";
  adminApp.style.display = "none";
  loginMessage.textContent = t("a.noLib");
} else {
  checkAdmin();

  window.supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(checkAdmin, 0);
  });
}