if (!requireLogin('/gmls_web/my-store.html')) {
  throw new Error('redirecting to login');
}

const storeIdParam = qs('store_id');
const storeNameParam = qs('name') || '';

function statusColor(status) {
  if (status === 'approved') return '#2e7d32';
  if (status === 'rejected') return '#c0392b';
  if (status === 'manager_approved') return '#2563eb';
  return '#e08a00';
}

function statusLabel(status) {
  if (status === 'manager_approved') return 'AWAITING ADMIN PUBLISH';
  return status.toUpperCase();
}

async function renderStoreList() {
  const content = document.getElementById('content');
  const [{ stores }, { categories }, { cities }, { malls }, { offers }] = await Promise.all([
    api.get('/stores/mine.php'),
    api.get('/categories/list.php'),
    api.get('/cities/list.php'),
    api.get('/malls/list.php'),
    api.get('/offers/mine.php'),
  ]);

  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const liveOffers = offers.filter((o) => o.status === 'approved');
  const approvedStores = stores.filter((s) => s.status === 'approved');

  content.innerHTML = `
    <div class="top-title">My Store</div>
    <div class="section-title">Analytics</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Stores</div>
        <div style="font-size:20px;font-weight:700;">${approvedStores.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ ${stores.length} approved</span></div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Live Offers</div>
        <div style="font-size:20px;font-weight:700;">${liveOffers.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ ${offers.length}${pendingOffers.length ? ` · ${pendingOffers.length} pending` : ''}</span></div>
      </div>
    </div>
    <div id="store-items"></div>
    <div class="section-title">Add a store</div>
    <div class="card">
      <form id="store-form">
        <div class="form-field"><label>Store name</label><input type="text" id="s-name" required /></div>
        <div class="form-field"><label>Description</label><textarea id="s-description" rows="2"></textarea></div>
        <div class="form-field"><label>Address</label><input type="text" id="s-address" /></div>
        <div class="form-field"><label>Phone</label><input type="tel" id="s-phone" /></div>
        <div class="form-field">
          <label>Category</label>
          <select id="s-category">
            <option value="">-</option>
            ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>City</label>
          <select id="s-city">
            <option value="">-</option>
            ${cities.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Mall (optional)</label>
          <select id="s-mall">
            <option value="">-</option>
            ${malls.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
          </select>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
            If your store is inside a mall, select it so the mall manager can review your listing.
          </div>
        </div>
        <div class="form-field">
          <label>Logo</label><input type="file" id="s-logo" accept="image/*" />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 500x500px and compressed automatically.</div>
        </div>
        <div class="error-text" id="s-error" style="display:none;"></div>
        <button class="btn" type="submit" id="s-submit">Submit for review</button>
      </form>
    </div>
  `;

  const myId = (currentUser() || {}).id;

  const itemsEl = document.getElementById('store-items');
  itemsEl.innerHTML = stores.length
    ? stores
        .map((s) => {
          // A store manager can approve/reject a pending edit their own
          // store_staff submitted — but never one they submitted themselves.
          const canReview = s.status === 'pending'
            && s.last_edited_by !== null
            && String(s.last_edited_by) !== String(myId);
          return `
      <div class="admin-item">
        <a class="list-row" style="flex:1;" href="/gmls_web/my-store.html?store_id=${s.id}&name=${encodeURIComponent(s.name)}">
          <div class="avatar">${s.logo_url ? `<img src="${escapeHtml(s.logo_url)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="" />` : '&#127978;'}</div>
          <div class="info">
            <div class="name">${escapeHtml(s.name)}</div>
            <div class="sub" style="color:${statusColor(s.status)};font-weight:700;">${statusLabel(s.status)}</div>
            ${s.status === 'rejected' && s.review_note ? `<div class="sub" style="color:var(--text-muted);">Reason: ${escapeHtml(s.review_note)}</div>` : ''}
            ${canReview ? '<div class="sub" style="color:var(--text-muted);">Edited by your staff — awaiting your review</div>' : ''}
          </div>
          <div class="chevron">&rsaquo;</div>
        </a>
        ${canReview ? `
        <div style="display:flex;gap:8px;padding:8px 0;">
          <button class="btn" style="width:auto;padding:6px 14px;" data-store-approve-id="${s.id}">Approve</button>
          <button class="btn danger" style="width:auto;padding:6px 14px;" data-store-reject-id="${s.id}">Reject</button>
        </div>` : ''}
      </div>`;
        })
        .join('')
    : '<div class="empty-state">You have no stores yet. Add one below.</div>';

  itemsEl.querySelectorAll('button[data-store-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_store.php', { id: Number(btn.dataset.storeApproveId), status: 'approved' });
      renderStoreList();
    });
  });
  itemsEl.querySelectorAll('button[data-store-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejecting this edit:');
      if (!note || !note.trim()) return;
      await api.post('/admin/review_store.php', { id: Number(btn.dataset.storeRejectId), status: 'rejected', note: note.trim() });
      renderStoreList();
    });
  });

  document.getElementById('store-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('s-submit');
    const err = document.getElementById('s-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const fd = new FormData();
      fd.set('name', document.getElementById('s-name').value.trim());
      fd.set('description', document.getElementById('s-description').value.trim());
      fd.set('address', document.getElementById('s-address').value.trim());
      fd.set('phone', document.getElementById('s-phone').value.trim());
      if (document.getElementById('s-category').value) fd.set('category_id', document.getElementById('s-category').value);
      if (document.getElementById('s-city').value) fd.set('city', document.getElementById('s-city').value);
      const mallSelect = document.getElementById('s-mall');
      if (mallSelect && mallSelect.value) fd.set('mall_id', mallSelect.value);
      const logo = document.getElementById('s-logo').files[0];
      if (logo) fd.set('logo', logo);
      try {
        await api.postForm('/stores/create.php', fd);
        renderStoreList();
        return;
      } catch (ex) {
        if (!/one-time listing fee/i.test(ex.message)) throw ex;
      }
      // First store for this owner — the listing fee hasn't been paid yet.
      // Pay it, then retry the exact same submission.
      err.textContent = 'A one-time ₹999 listing fee applies to your first store. Opening payment...';
      err.style.display = 'block';
      await payWithRazorpay({ purpose: 'store_listing', description: 'GLML store listing fee' });
      await api.postForm('/stores/create.php', fd);
      renderStoreList();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });
}

async function renderStoreOffers() {
  const content = document.getElementById('content');
  const [{ offers }, { ads }, { store }] = await Promise.all([
    api.get('/offers/mine.php'),
    api.get('/store_ads/mine.php'),
    api.get('/stores/get.php', { id: storeIdParam }),
  ]);
  const mine = offers.filter((o) => String(o.store_id) === String(storeIdParam));
  const myAds = ads.filter((a) => String(a.store_id) === String(storeIdParam));

  // A mall manager reaches this page from the manager dashboard's "Manage
  // Offers" link, not from /my-store.html, so send them back there instead.
  const isMallManager = (currentUser() || {}).role === 'mall_manager';
  const backHref = isMallManager ? '/gmls_web/manager-dashboard.html' : '/gmls_web/my-store.html';
  const backLabel = isMallManager ? 'Mall Manager Dashboard' : 'My Store';

  content.innerHTML = `
    <a class="back-link" href="${backHref}">&larr; ${backLabel}</a>
    <div class="top-title">${escapeHtml(storeNameParam)}</div>
    <div class="section-title" style="margin-top:0;">Website Traffic (last 30 days) — via Google Analytics</div>
    <div class="card" id="ga-store-panel"><p style="font-size:13px;color:var(--text-muted);">Loading...</p></div>
    <div id="offer-items"></div>
    <div class="section-title">Add an offer</div>
    <div class="card">
      <form id="offer-form">
        <div class="form-field"><label>Offer title</label><input type="text" id="o-title" required /></div>
        <div class="form-field"><label>Description</label><textarea id="o-description" rows="2"></textarea></div>
        <div class="form-field"><label>Original price</label><input type="number" step="0.01" id="o-original" /></div>
        <div class="form-field"><label>Discounted price</label><input type="number" step="0.01" id="o-discounted" /></div>
        <div class="form-field"><label>Discount %</label><input type="number" id="o-percent" /></div>
        <div class="form-field"><label>Expires on</label><input type="date" id="o-expires" required /></div>
        <div class="form-field">
          <label>Image</label><input type="file" id="o-image" accept="image/*" />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge and compressed automatically.</div>
        </div>
        <div class="error-text" id="o-error" style="display:none;"></div>
        <button class="btn" type="submit" id="o-submit">Submit for review</button>
      </form>
    </div>
    ${!isMallManager ? `
    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
      <span>Store Ads</span>
      <span style="font-size:13px;font-weight:400;color:var(--text-muted);">${store.ad_credits} credit${store.ad_credits === 1 ? '' : 's'} left</span>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;">Each ad upload — by you or your staff — uses one credit. ₹99 per credit.</p>
      <div style="display:flex;gap:8px;align-items:center;">
        <select id="sad-credit-qty" style="flex:1;">
          <option value="1">1 credit — ₹99</option>
          <option value="5">5 credits — ₹495</option>
          <option value="10">10 credits — ₹990</option>
        </select>
        <button class="btn" style="width:auto;padding:8px 16px;" id="sad-buy-credits">Buy Credits</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <input type="text" id="sad-credit-product" placeholder="Product (optional, e.g. Shirt)" style="flex:1;" />
        <input type="text" id="sad-credit-brand" placeholder="Brand (optional, e.g. Arrow)" style="flex:1;" />
      </div>
      <div class="error-text" id="sad-credit-error" style="display:none;"></div>
    </div>
    <div id="ad-items"></div>
    <div class="card">
      <form id="sad-form">
        <div class="form-field">
          <label>Image</label><input type="file" id="sad-image" accept="image/*" required />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge and compressed automatically.</div>
        </div>
        <div class="form-field"><label>Link URL (optional)</label><input type="url" id="sad-link" placeholder="https://..." /></div>
        <div class="form-field"><label>Product (optional)</label><input type="text" id="sad-product" placeholder="e.g. Shirt" /></div>
        <div class="form-field"><label>Brand (optional)</label><input type="text" id="sad-brand" placeholder="e.g. Arrow" /></div>
        <div class="error-text" id="sad-error" style="display:none;"></div>
        <button class="btn" type="submit" id="sad-submit">Submit for review</button>
      </form>
    </div>` : ''}
    <div class="section-title">Store Products</div>
    <div id="product-items"></div>
    <div class="card">
      <form id="sp-form">
        <div class="form-field">
          <label>Photo</label><input type="file" id="sp-image" accept="image/*" required />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB. Goes live immediately — no review needed.</div>
        </div>
        <div class="form-field"><label>Caption (optional)</label><input type="text" id="sp-caption" maxlength="150" /></div>
        <div class="error-text" id="sp-error" style="display:none;"></div>
        <button class="btn" type="submit" id="sp-submit">Add Product</button>
      </form>
    </div>
    <div class="section-title">WhatsApp Subscribers</div>
    <div class="card">
      <p style="font-size:13px;color:var(--text-muted);margin:0 0 10px;" id="wa-sub-count">Loading...</p>
      <button class="btn outline" style="width:auto;padding:8px 16px;" id="wa-sub-download">Download CSV</button>
    </div>
  `;

  renderGaPanel(document.getElementById('ga-store-panel'), '/analytics/store_report.php', { store_id: storeIdParam });

  const myId = (currentUser() || {}).id;

  const itemsEl = document.getElementById('offer-items');
  itemsEl.innerHTML = mine.length
    ? mine
        .map((o) => {
          // Only the store manager (not mall manager) approves offers, and
          // only ones their own staff submitted — never their own.
          const canReview = !isMallManager
            && o.status === 'pending'
            && o.submitted_by !== null
            && String(o.submitted_by) !== String(myId);
          return `
      <div class="admin-item">
        ${o.image_url ? `<img class="thumb" src="${escapeHtml(o.image_url)}" alt="" />` : '<div class="thumb"></div>'}
        <div class="info">
          <div class="name">${escapeHtml(o.title)}</div>
          <div class="sub" style="color:${statusColor(o.status)};font-weight:700;">${statusLabel(o.status)}</div>
          ${canReview ? '<div class="sub" style="color:var(--text-muted);">Submitted by your staff — awaiting your review</div>' : ''}
        </div>
        ${canReview ? `
        <button class="btn" style="width:auto;padding:6px 14px;" data-offer-approve-id="${o.id}">Approve</button>
        <button class="btn danger" style="width:auto;padding:6px 14px;" data-offer-reject-id="${o.id}">Reject</button>
        ` : `<button class="btn danger" data-id="${o.id}">Delete</button>`}
      </div>`;
        })
        .join('')
    : '<div class="empty-state">No offers yet. Add one below.</div>';

  itemsEl.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/offers/delete.php', { id: Number(btn.dataset.id) });
      renderStoreOffers();
    });
  });

  itemsEl.querySelectorAll('button[data-offer-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_offer.php', { id: Number(btn.dataset.offerApproveId), status: 'approved' });
      renderStoreOffers();
    });
  });
  itemsEl.querySelectorAll('button[data-offer-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_offer.php', { id: Number(btn.dataset.offerRejectId), status: 'rejected' });
      renderStoreOffers();
    });
  });

  document.getElementById('offer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('o-submit');
    const err = document.getElementById('o-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const fd = new FormData();
      fd.set('store_id', storeIdParam);
      fd.set('title', document.getElementById('o-title').value.trim());
      fd.set('description', document.getElementById('o-description').value.trim());
      fd.set('expires_at', document.getElementById('o-expires').value);
      if (document.getElementById('o-original').value) fd.set('original_price', document.getElementById('o-original').value);
      if (document.getElementById('o-discounted').value) fd.set('discounted_price', document.getElementById('o-discounted').value);
      if (document.getElementById('o-percent').value) fd.set('discount_percent', document.getElementById('o-percent').value);
      const image = document.getElementById('o-image').files[0];
      if (image) fd.set('image', image);
      await api.postForm('/offers/create.php', fd);
      renderStoreOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });

  const { products } = await api.get('/store_products/list.php', { store_id: storeIdParam });
  const productItemsEl = document.getElementById('product-items');
  productItemsEl.innerHTML = products.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:8px;margin-bottom:16px;">
        ${products
          .map(
            (p) => `
          <div style="position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--surface-alt,#eee);">
            <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || '')}" style="width:100%;height:100%;object-fit:cover;" />
            <button class="btn danger" data-sp-delete-id="${p.id}" style="position:absolute;top:4px;right:4px;width:auto;padding:2px 8px;font-size:12px;">&times;</button>
          </div>`
          )
          .join('')}
      </div>`
    : '<div class="empty-state">No product photos yet. Add one below.</div>';

  productItemsEl.querySelectorAll('button[data-sp-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/store_products/delete.php', { id: Number(btn.dataset.spDeleteId) });
      renderStoreOffers();
    });
  });

  document.getElementById('sp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sp-submit');
    const err = document.getElementById('sp-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
      const image = document.getElementById('sp-image').files[0];
      if (!image) throw new Error('A photo is required');
      const fd = new FormData();
      fd.set('store_id', storeIdParam);
      fd.set('image', image);
      const caption = document.getElementById('sp-caption').value.trim();
      if (caption) fd.set('caption', caption);
      await api.postForm('/store_products/create.php', fd);
      renderStoreOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Product';
    }
  });

  (async () => {
    const countEl = document.getElementById('wa-sub-count');
    try {
      const res = await fetch(`${API_BASE}/store_whatsapp/export.php?store_id=${storeIdParam}`, { headers: headers() });
      if (!res.ok) throw new Error('Could not load subscribers');
      const text = await res.text();
      const count = Math.max(0, text.trim().split('\n').length - 1);
      countEl.textContent = `${count} shopper${count === 1 ? '' : 's'} subscribed for WhatsApp updates.`;
    } catch (ex) {
      countEl.textContent = ex.message;
    }
  })();

  document.getElementById('wa-sub-download').addEventListener('click', async () => {
    const btn = document.getElementById('wa-sub-download');
    btn.disabled = true;
    try {
      await downloadAuthedFile(`${API_BASE}/store_whatsapp/export.php?store_id=${storeIdParam}`, 'whatsapp-subscribers.csv');
    } catch (ex) {
      alert(ex.message);
    } finally {
      btn.disabled = false;
    }
  });

  if (isMallManager) return;

  document.getElementById('sad-buy-credits').addEventListener('click', async () => {
    const btn = document.getElementById('sad-buy-credits');
    const err = document.getElementById('sad-credit-error');
    err.style.display = 'none';
    const quantity = Number(document.getElementById('sad-credit-qty').value);
    btn.disabled = true;
    btn.textContent = 'Opening payment...';
    try {
      await payWithRazorpay({
        purpose: 'store_ad_credits',
        storeId: storeIdParam,
        quantity,
        productName: document.getElementById('sad-credit-product').value.trim(),
        brandName: document.getElementById('sad-credit-brand').value.trim(),
        description: `${quantity} ad credit${quantity === 1 ? '' : 's'} for ${storeNameParam}`,
      });
      renderStoreOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Buy Credits';
    }
  });

  const adItemsEl = document.getElementById('ad-items');
  adItemsEl.innerHTML = myAds.length
    ? myAds
        .map((a) => {
          const canReview = a.status === 'pending'
            && String(a.uploaded_by) !== String(myId);
          return `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div class="name" style="color:${statusColor(a.status)};font-weight:700;">${statusLabel(a.status)}</div>
          ${a.uploaded_by_name ? `<div class="sub" style="color:var(--text-muted);">by ${escapeHtml(a.uploaded_by_name)}</div>` : ''}
          ${a.status === 'rejected' && a.review_note ? `<div class="sub" style="color:var(--text-muted);">Reason: ${escapeHtml(a.review_note)}</div>` : ''}
          ${canReview ? '<div class="sub" style="color:var(--text-muted);">Submitted by your staff — awaiting your review</div>' : ''}
        </div>
        ${canReview ? `
        <button class="btn" style="width:auto;padding:6px 14px;" data-sad-approve-id="${a.id}">Approve</button>
        <button class="btn danger" style="width:auto;padding:6px 14px;" data-sad-reject-id="${a.id}">Reject</button>
        ` : `<button class="btn danger" data-sad-delete-id="${a.id}">Delete</button>`}
      </div>`;
        })
        .join('')
    : '<div class="empty-state">No store ads submitted yet.</div>';

  adItemsEl.querySelectorAll('button[data-sad-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/store_ads/delete.php', { id: Number(btn.dataset.sadDeleteId) });
      renderStoreOffers();
    });
  });
  adItemsEl.querySelectorAll('button[data-sad-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/store_ads/review.php', { id: Number(btn.dataset.sadApproveId), status: 'approved' });
      renderStoreOffers();
    });
  });
  adItemsEl.querySelectorAll('button[data-sad-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejecting this ad:');
      if (!note || !note.trim()) return;
      await api.post('/store_ads/review.php', { id: Number(btn.dataset.sadRejectId), status: 'rejected', note: note.trim() });
      renderStoreOffers();
    });
  });

  document.getElementById('sad-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('sad-submit');
    const err = document.getElementById('sad-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const image = document.getElementById('sad-image').files[0];
      if (!image) throw new Error('An image is required');
      const fd = new FormData();
      fd.set('store_id', storeIdParam);
      fd.set('image', image);
      const link = document.getElementById('sad-link').value.trim();
      if (link) fd.set('link_url', link);
      const product = document.getElementById('sad-product').value.trim();
      if (product) fd.set('product_name', product);
      const brand = document.getElementById('sad-brand').value.trim();
      if (brand) fd.set('brand_name', brand);
      await api.postForm('/store_ads/create.php', fd);
      renderStoreOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });
}

(storeIdParam ? renderStoreOffers() : renderStoreList()).catch((e) => {
  document.getElementById('content').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
});
