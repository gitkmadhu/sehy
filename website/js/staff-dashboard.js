if (!requireLogin('/sehy_web/staff-dashboard.html')) {
  throw new Error('redirecting to login');
}

function statusBadge(status) {
  const styles = {
    approved: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    pending: 'text-amber-700 bg-amber-50 border border-amber-200',
    rejected: 'text-rose-700 bg-rose-50 border border-rose-200',
    manager_approved: 'text-blue-700 bg-blue-50 border border-blue-200',
  };
  const labels = { manager_approved: 'Awaiting Admin Publish' };
  const label = labels[status] || (status.charAt(0).toUpperCase() + status.slice(1));
  return `<span class="px-2.5 py-1 text-xs font-medium ${styles[status] || styles.pending} rounded-full">${label}</span>`;
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

/**
 * A dashed-border image upload field with a live client-side preview,
 * styled like the rest of the form fields around it. Pair with
 * bindUploadPreview() on the returned <input> after it's in the DOM.
 */
function uploadBoxHtml(id, label, hint, opts) {
  const required = opts && opts.required ? 'required' : '';
  return `
    <div>
      <label class="block text-xs font-semibold text-gray-600 mb-1">${escapeHtml(label)}</label>
      <div class="upload-box relative border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center">
        <img class="preview-img hidden w-full max-h-36 object-cover rounded mb-2 mx-auto" alt="" />
        <input type="file" id="${id}" accept="image/jpeg,image/png,image/webp" ${required} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <p class="text-xs text-gray-500 pointer-events-none"><strong class="text-gray-700">Click to upload</strong><br>${escapeHtml(hint)}</p>
        <div class="file-name text-xs text-gray-400 mt-1"></div>
      </div>
    </div>`;
}

/** Shows a live preview + filename inside an .upload-box when its file input changes. */
function bindUploadPreview(input) {
  input.addEventListener('change', () => {
    const box = input.closest('.upload-box');
    const preview = box.querySelector('.preview-img');
    const name = box.querySelector('.file-name');
    const file = input.files && input.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
    name.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;
  });
}

const TABS = [
  { id: 'profile', label: 'Service Profile', icon: '&#127970;' },
  { id: 'banners', label: 'Service Banners', icon: '&#128444;&#65039;' },
  { id: 'social', label: 'Social Media', icon: '&#128241;' },
  { id: 'view', label: 'Service View', icon: '&#128717;&#65039;' },
  { id: 'analytics', label: 'Analytics', icon: '&#128202;' },
];

// Fetched once on load, re-fetched after any save; the currently active tab
// re-renders from this shared state rather than each tab owning its own fetch.
const state = { user: null, service: null, offers: [], ads: [], products: [], tags: [], areas: [] };
let activeTab = 'profile';

function setActiveNav() {
  document.querySelectorAll('.nav-tab').forEach((el) => {
    const isActive = el.dataset.tab === activeTab;
    el.classList.toggle('bg-indigo-50', isActive);
    el.classList.toggle('text-indigo-700', isActive);
    el.classList.toggle('font-medium', isActive);
    el.classList.toggle('text-gray-600', !isActive);
  });
}

async function goToTab(tab) {
  activeTab = tab;
  setActiveNav();
  await render();
}

async function loadData() {
  const { user } = await api.get('/auth/me.php');
  state.user = user;
  if (user.role !== 'service_staff') return;

  document.getElementById('category-heading').textContent = `${(user.service_name || 'SERVICE').toUpperCase()} — STAFF PORTAL`;
  document.getElementById('staff-name').textContent = `${user.name} (Staff)`;

  const [{ services }, { offers }, { ads }, { tags }, { areas }] = await Promise.all([
    api.get('/services/mine.php'),
    api.get('/offers/mine.php'),
    api.get('/service_ads/mine.php'),
    api.get('/tags/list.php'),
    api.get('/areas/list.php'),
  ]);
  state.service = services[0] || null;
  state.offers = offers;
  state.ads = ads;
  state.tags = tags;
  state.areas = areas;
  state.products = state.service ? (await api.get('/service_products/list.php', { service_id: state.service.id })).products : [];
}

async function render() {
  const content = document.getElementById('content');
  if (state.user.role !== 'service_staff') {
    content.innerHTML = '<div class="text-rose-600">This portal is for service staff only.</div>';
    return;
  }
  if (!state.service) {
    content.innerHTML = '<p class="text-sm text-gray-500">No service is linked to your account yet. Contact the category manager.</p>';
    return;
  }
  const renderers = {
    profile: renderProfileTab,
    banners: renderBannersTab,
    social: renderSocialTab,
    view: renderViewTab,
    analytics: renderAnalyticsTab,
  };
  await renderers[activeTab]();
  content.querySelectorAll('.upload-box input[type=file]').forEach(bindUploadPreview);
}

async function reload() {
  await loadData();
  await render();
}

function renderProfileTab() {
  const content = document.getElementById('content');
  const { service, tags, areas } = state;
  content.innerHTML = `
    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
        <h2 class="text-lg font-bold text-gray-800 truncate">Service Profile: ${escapeHtml(service.name)}</h2>
        ${statusBadge(service.status)}
      </div>
      <p class="text-sm text-gray-600 bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-4">
        &#9888; <strong>Notice:</strong> Any changes you make here are sent to the Service Manager for review before going live.
      </p>
      <form id="profile-form" class="space-y-3">
        <input id="st-name" placeholder="Service name" value="${escapeHtml(service.name || '')}" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        <textarea id="st-description" placeholder="Description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">${escapeHtml(service.description || '')}</textarea>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select id="st-tag" class="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Tag</option>
            ${tags.map((c) => `<option value="${c.id}" ${String(c.id) === String(service.tag_id) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <select id="st-area" class="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Area</option>
            ${areas.map((c) => `<option value="${escapeHtml(c.name)}" ${c.name === service.area ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input id="st-address" placeholder="Address / unit" value="${escapeHtml(service.address || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input id="st-phone" placeholder="Phone" value="${escapeHtml(service.phone || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input id="st-whatsapp" placeholder="WhatsApp number for click-to-chat (optional)" value="${escapeHtml(service.whatsapp || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input id="st-website" placeholder="Website (optional)" value="${escapeHtml(service.website || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div class="max-w-xs">${uploadBoxHtml('st-logo', 'Logo', 'Square image works best — resized to 500×500px.')}</div>
        <div>
          <input id="st-place-id" placeholder="Google Place ID (optional)" value="${escapeHtml(service.google_place_id || '')}" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          <p class="text-xs text-gray-400 mt-1">Adds a "Google Reviews" button on your service page, linking to your real Google listing. Find your Place ID by searching your business at <span class="whitespace-nowrap">developers.google.com/maps/documentation/places/web-service/place-id</span>.</p>
        </div>
        <div id="st-error" class="text-rose-600 text-xs hidden"></div>
        <button type="submit" id="st-submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium">Save &amp; Send for Approval</button>
      </form>
    </section>`;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('st-submit');
    const err = document.getElementById('st-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const fd = new FormData();
      fd.set('id', service.id);
      fd.set('name', document.getElementById('st-name').value.trim());
      fd.set('description', document.getElementById('st-description').value.trim());
      fd.set('address', document.getElementById('st-address').value.trim());
      fd.set('phone', document.getElementById('st-phone').value.trim());
      fd.set('whatsapp', document.getElementById('st-whatsapp').value.trim());
      fd.set('website', document.getElementById('st-website').value.trim());
      fd.set('google_place_id', document.getElementById('st-place-id').value.trim());
      if (document.getElementById('st-tag').value) fd.set('tag_id', document.getElementById('st-tag').value);
      if (document.getElementById('st-area').value) fd.set('area', document.getElementById('st-area').value);
      const logo = document.getElementById('st-logo').files[0];
      if (logo) fd.set('logo', logo);
      await api.postForm('/services/update.php', fd);
      await reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Send for Approval';
    }
  });
}

const MAX_BANNERS = 4;

function renderBannersTab() {
  const content = document.getElementById('content');
  const { service, ads } = state;
  const atCap = ads.length >= MAX_BANNERS;
  content.innerHTML = `
    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
        <h2 class="text-lg font-bold text-gray-800">Service Banners</h2>
        ${atCap ? '' : `
        <button id="toggle-ad-form" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>+</span> Upload Banner
        </button>`}
      </div>
      <p class="text-sm text-gray-500 mb-4">${ads.length} of ${MAX_BANNERS} banners. These scroll at the top of your service page as a hero carousel.${atCap ? ' Delete one to upload another.' : ''}</p>
      <div id="ad-form-wrap" class="hidden mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <form id="ad-form" class="space-y-3">
          <div class="max-w-xs">${uploadBoxHtml('a-image', 'Banner image', 'JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge.', { required: true })}</div>
          <input id="a-link" type="url" placeholder="Destination link (optional)" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          <div class="grid grid-cols-2 gap-3">
            <input id="a-product" type="text" placeholder="Product (optional, e.g. Shirt)" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="a-brand" type="text" placeholder="Brand (optional, e.g. Arrow)" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div id="a-error" class="text-rose-600 text-xs hidden"></div>
          <button type="submit" id="a-submit" class="w-full sm:w-auto bg-indigo-600 text-white rounded px-4 py-2 text-sm hover:bg-indigo-700">Upload</button>
        </form>
      </div>
      ${adTableHtml(ads)}
    </section>`;

  const toggleBtn = document.getElementById('toggle-ad-form');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.getElementById('ad-form-wrap').classList.toggle('hidden');
    });
  }

  document.querySelectorAll('button[data-ad-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this banner?')) return;
      await api.del('/service_ads/delete.php', { id: Number(btn.dataset.adDeleteId) });
      await reload();
    });
  });

  document.getElementById('ad-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('a-submit');
    const err = document.getElementById('a-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
      const image = document.getElementById('a-image').files[0];
      if (!image) throw new Error('An image is required');
      const fd = new FormData();
      fd.set('image', image);
      const link = document.getElementById('a-link').value.trim();
      if (link) fd.set('link_url', link);
      const product = document.getElementById('a-product').value.trim();
      if (product) fd.set('product_name', product);
      const brand = document.getElementById('a-brand').value.trim();
      if (brand) fd.set('brand_name', brand);
      await api.postForm('/service_ads/create.php', fd);
      await reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  });
}

function renderSocialTab() {
  const content = document.getElementById('content');
  const { service } = state;
  content.innerHTML = `
    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 class="text-lg font-bold text-gray-800 mb-1">Social Media</h2>
      <p class="text-sm text-gray-600 bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-4">
        &#9888; <strong>Notice:</strong> Any changes you make here are sent to the Service Manager for review before going live.
      </p>
      <form id="social-form" class="space-y-5">
        <div>
          <h3 class="text-sm font-bold text-gray-700">Channel Links</h3>
          <p class="text-xs text-gray-400 mb-3">Open links shown to every shopper on your service page.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="st-instagram-channel" placeholder="Instagram channel link (optional)" value="${escapeHtml(service.instagram_channel_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-youtube-channel" placeholder="YouTube channel link (optional)" value="${escapeHtml(service.youtube_channel_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-facebook-channel" placeholder="Facebook channel link (optional)" value="${escapeHtml(service.facebook_channel_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-twitter-channel" placeholder="Twitter/X channel link (optional)" value="${escapeHtml(service.twitter_channel_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-bold text-gray-700">Featured Post</h3>
          <p class="text-xs text-gray-400 mb-3">One post per platform, shown large on your service page. A regular YouTube link and a Shorts link land in different rows automatically.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="st-embed-instagram" placeholder="Instagram post/reel URL (optional)" value="${escapeHtml(service.embed_instagram_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-embed-youtube" placeholder="YouTube video/Shorts URL (optional)" value="${escapeHtml(service.embed_youtube_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-embed-facebook" placeholder="Facebook post/video URL (optional)" value="${escapeHtml(service.embed_facebook_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="st-embed-twitter" placeholder="Tweet/X post URL (optional)" value="${escapeHtml(service.embed_twitter_url || '')}" class="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div id="sm-error" class="text-rose-600 text-xs hidden"></div>
        <button type="submit" id="sm-submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium">Save &amp; Send for Approval</button>
      </form>
    </section>`;

  document.getElementById('social-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sm-submit');
    const err = document.getElementById('sm-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const fd = new FormData();
      fd.set('id', service.id);
      fd.set('instagram_channel_url', document.getElementById('st-instagram-channel').value.trim());
      fd.set('youtube_channel_url', document.getElementById('st-youtube-channel').value.trim());
      fd.set('facebook_channel_url', document.getElementById('st-facebook-channel').value.trim());
      fd.set('twitter_channel_url', document.getElementById('st-twitter-channel').value.trim());
      fd.set('embed_instagram_url', document.getElementById('st-embed-instagram').value.trim());
      fd.set('embed_youtube_url', document.getElementById('st-embed-youtube').value.trim());
      fd.set('embed_facebook_url', document.getElementById('st-embed-facebook').value.trim());
      fd.set('embed_twitter_url', document.getElementById('st-embed-twitter').value.trim());
      await api.postForm('/services/update.php', fd);
      await reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Send for Approval';
    }
  });
}

const MAX_OFFERS = 10;
const MAX_PRODUCTS = 10;

function renderViewTab() {
  const content = document.getElementById('content');
  const { service, offers, products } = state;
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const offersAtCap = offers.length >= MAX_OFFERS;
  const productsAtCap = products.length >= MAX_PRODUCTS;

  content.innerHTML = `
    <div class="flex justify-end mb-2">
      <a href="/sehy_web/service.html?id=${service.id}" target="_blank" rel="noopener" class="px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition font-medium">Preview Service Page</a>
    </div>

    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
        <h2 class="text-lg font-bold text-gray-800">My Offers</h2>
        ${offersAtCap ? '' : `
        <button id="toggle-offer-form" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>+</span> Add Offer
        </button>`}
      </div>
      <p class="text-sm text-gray-500 mb-4">${offers.length} of ${MAX_OFFERS} offers.${offersAtCap ? ' Delete one to add another.' : ''}</p>
      <div id="offer-form-wrap" class="hidden mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <form id="offer-form" class="space-y-3">
          <input id="o-title" placeholder="Offer title" required class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          <textarea id="o-description" placeholder="Description" rows="2" class="w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="o-original" type="number" step="0.01" placeholder="Original price" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="o-discounted" type="number" step="0.01" placeholder="Discounted price" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="o-percent" type="number" placeholder="Discount %" class="border border-gray-300 rounded px-3 py-2 text-sm" />
            <input id="o-expires" type="date" required class="border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div class="max-w-xs">${uploadBoxHtml('o-image', 'Offer image', 'JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge.')}</div>
          <div id="o-error" class="text-rose-600 text-xs hidden"></div>
          <button type="submit" id="o-submit" class="w-full sm:w-auto bg-indigo-600 text-white rounded px-4 py-2 text-sm hover:bg-indigo-700">Submit for review</button>
        </form>
      </div>
      ${pendingOffers.length ? `<p class="text-xs text-amber-600 mb-3">${pendingOffers.length} offer${pendingOffers.length === 1 ? '' : 's'} awaiting review.</p>` : ''}
      ${offerTableHtml(offers)}
    </section>

    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
        <h2 class="text-lg font-bold text-gray-800">Service Products</h2>
        ${productsAtCap ? '' : `
        <button id="toggle-product-form" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <span>+</span> Add Product
        </button>`}
      </div>
      <p class="text-sm text-gray-500 mb-4">${products.length} of ${MAX_PRODUCTS} products.${productsAtCap ? ' Delete one to add another.' : ''}</p>
      <div id="product-form-wrap" class="hidden mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <form id="product-form" class="space-y-3">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="sm:w-1/2">${uploadBoxHtml('sp-image', 'Product photo', 'JPEG, PNG, or WEBP, up to 40MB. Goes live immediately — no review needed.', { required: true })}</div>
            <input id="sp-caption" placeholder="Caption (optional)" maxlength="150" class="w-full border border-gray-300 rounded px-3 py-2 text-sm h-fit" />
          </div>
          <div id="sp-error" class="text-rose-600 text-xs hidden"></div>
          <button type="submit" id="sp-submit" class="w-full sm:w-auto bg-indigo-600 text-white rounded px-4 py-2 text-sm hover:bg-indigo-700">Add Product</button>
        </form>
      </div>
      ${productTableHtml(products)}
    </section>`;

  const toggleOfferBtn = document.getElementById('toggle-offer-form');
  if (toggleOfferBtn) {
    toggleOfferBtn.addEventListener('click', () => {
      document.getElementById('offer-form-wrap').classList.toggle('hidden');
    });
  }
  document.querySelectorAll('button[data-offer-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this offer?')) return;
      await api.del('/offers/delete.php', { id: Number(btn.dataset.offerDeleteId) });
      await reload();
    });
  });
  document.getElementById('offer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('o-submit');
    const err = document.getElementById('o-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const fd = new FormData();
      fd.set('service_id', service.id);
      fd.set('title', document.getElementById('o-title').value.trim());
      fd.set('description', document.getElementById('o-description').value.trim());
      fd.set('expires_at', document.getElementById('o-expires').value);
      if (document.getElementById('o-original').value) fd.set('original_price', document.getElementById('o-original').value);
      if (document.getElementById('o-discounted').value) fd.set('discounted_price', document.getElementById('o-discounted').value);
      if (document.getElementById('o-percent').value) fd.set('discount_percent', document.getElementById('o-percent').value);
      const image = document.getElementById('o-image').files[0];
      if (image) fd.set('image', image);
      await api.postForm('/offers/create.php', fd);
      await reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });

  const toggleProductBtn = document.getElementById('toggle-product-form');
  if (toggleProductBtn) {
    toggleProductBtn.addEventListener('click', () => {
      document.getElementById('product-form-wrap').classList.toggle('hidden');
    });
  }
  document.querySelectorAll('button[data-product-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this product photo?')) return;
      await api.del('/service_products/delete.php', { id: Number(btn.dataset.productDeleteId) });
      await reload();
    });
  });
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sp-submit');
    const err = document.getElementById('sp-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
      const image = document.getElementById('sp-image').files[0];
      if (!image) throw new Error('A photo is required');
      const fd = new FormData();
      fd.set('service_id', service.id);
      fd.set('image', image);
      const caption = document.getElementById('sp-caption').value.trim();
      if (caption) fd.set('caption', caption);
      await api.postForm('/service_products/create.php', fd);
      await reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Product';
    }
  });
}

async function renderAnalyticsTab() {
  const content = document.getElementById('content');
  const { service, offers } = state;
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const liveOffers = offers.filter((o) => o.status === 'approved');
  const rejectedOffers = offers.filter((o) => o.status === 'rejected');

  content.innerHTML = `
    <section class="mb-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4">Analytics</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Service Status</p>
          <p class="text-xl font-bold text-gray-800 mt-1">${service.status === 'manager_approved' ? 'AWAITING PUBLISH' : service.status.toUpperCase()}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Offers</p>
          <p class="text-xl font-bold text-gray-800 mt-1">${liveOffers.length} <span class="text-sm font-normal text-gray-400">/ ${offers.length} total</span></p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <p class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Review</p>
          <p class="text-xl font-bold text-amber-800 mt-1">${pendingOffers.length} <span class="text-sm font-normal text-amber-600">${rejectedOffers.length ? `· ${rejectedOffers.length} rejected` : ''}</span></p>
        </div>
      </div>
    </section>

    <section class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 class="text-lg font-bold text-gray-800 mb-4">WhatsApp Subscribers</h2>
      <p class="text-sm text-gray-500 mb-4" id="wa-sub-count">Loading...</p>
      <button id="wa-sub-download" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Download CSV</button>
    </section>`;

  const countEl = document.getElementById('wa-sub-count');
  try {
    const res = await fetch(`${API_BASE}/service_whatsapp/export.php?service_id=${service.id}`, { headers: headers() });
    if (!res.ok) throw new Error('Could not load subscribers');
    const text = await res.text();
    const count = Math.max(0, text.trim().split('\n').length - 1);
    countEl.textContent = `${count} shopper${count === 1 ? '' : 's'} subscribed for WhatsApp updates.`;
  } catch (ex) {
    countEl.textContent = ex.message;
  }

  document.getElementById('wa-sub-download').addEventListener('click', async () => {
    const btn = document.getElementById('wa-sub-download');
    btn.disabled = true;
    try {
      await downloadAuthedFile(`${API_BASE}/service_whatsapp/export.php?service_id=${service.id}`, 'whatsapp-subscribers.csv');
    } catch (ex) {
      alert(ex.message);
    } finally {
      btn.disabled = false;
    }
  });
}

function adTableHtml(ads) {
  if (!ads.length) {
    return '<p class="text-sm text-gray-500">No banners uploaded yet.</p>';
  }
  return `
    <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-gray-500">
          <th class="pb-3">Preview</th>
          <th class="pb-3">Destination Link</th>
          <th class="pb-3">Status</th>
          <th class="pb-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        ${ads
          .map(
            (a) => `
        <tr>
          <td class="py-3"><img src="${escapeHtml(a.image_url)}" class="w-16 h-9 object-cover rounded" alt="" /></td>
          <td class="py-3 text-indigo-600">${a.link_url ? escapeHtml(a.link_url) : '—'}</td>
          <td class="py-3">${statusBadge(a.status)}</td>
          <td class="py-3 text-right"><button class="text-rose-600 hover:underline" data-ad-delete-id="${a.id}">Delete</button></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    </div>`;
}

function productTableHtml(products) {
  if (!products.length) {
    return '<p class="text-sm text-gray-500">No product photos yet.</p>';
  }
  return `
    <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-gray-500">
          <th class="pb-3">Photo</th>
          <th class="pb-3">Caption</th>
          <th class="pb-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        ${products
          .map(
            (p) => `
        <tr>
          <td class="py-3"><img src="${escapeHtml(p.image_url)}" class="w-16 h-16 object-cover rounded" alt="" /></td>
          <td class="py-3 text-gray-800">${p.caption ? escapeHtml(p.caption) : '—'}</td>
          <td class="py-3 text-right"><button class="text-rose-600 hover:underline" data-product-delete-id="${p.id}">Delete</button></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    </div>`;
}

function offerTableHtml(offers) {
  if (!offers.length) {
    return '<p class="text-sm text-gray-500">No offers yet.</p>';
  }
  return `
    <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-gray-500">
          <th class="pb-3">Preview</th>
          <th class="pb-3">Title</th>
          <th class="pb-3">Expires</th>
          <th class="pb-3">Status</th>
          <th class="pb-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        ${offers
          .map(
            (o) => `
        <tr>
          <td class="py-3">${o.image_url ? `<img src="${escapeHtml(o.image_url)}" class="w-16 h-9 object-cover rounded" alt="" />` : '—'}</td>
          <td class="py-3 text-gray-800">${escapeHtml(o.title)}</td>
          <td class="py-3 text-gray-500 text-xs">${fmtDate(o.expires_at)}</td>
          <td class="py-3">${statusBadge(o.status)}</td>
          <td class="py-3 text-right"><button class="text-rose-600 hover:underline" data-offer-delete-id="${o.id}">Delete</button></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    </div>`;
}

document.getElementById('signout-btn').addEventListener('click', () => {
  logout();
  window.location.href = '/sehy_web/index.html';
});

document.getElementById('nav-tabs').innerHTML = TABS
  .map((t) => `<a href="#" data-tab="${t.id}" class="nav-tab shrink-0 md:shrink block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg whitespace-nowrap">${t.icon} ${escapeHtml(t.label)}</a>`)
  .join('');
document.querySelectorAll('.nav-tab').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    goToTab(el.dataset.tab);
  });
});
setActiveNav();

reload().catch((e) => {
  document.getElementById('content').innerHTML = `<div class="text-rose-600">${escapeHtml(e.message)}</div>`;
});
