if (!requireLogin('/sehy_web/my-service.html')) {
  throw new Error('redirecting to login');
}

const serviceIdParam = qs('service_id');
const serviceNameParam = qs('name') || '';

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

// --- Service location picker (Google Maps) ---------------------------------
// Loaded lazily and only if a browser key is configured server-side (see
// maps/config.php) — the section stays hidden otherwise. The script itself
// is only ever injected once per page load; re-running initLocationPicker()
// (e.g. after renderServiceList() rebuilds the form on a successful submit)
// just re-creates the Map against the fresh #s-map div.
let mapsScriptPromise = null;
let pickedLat = null;
let pickedLng = null;

function loadGoogleMapsScript(key) {
  if (window.google && window.google.maps) return Promise.resolve();
  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return mapsScriptPromise;
}

async function initLocationPicker() {
  const field = document.getElementById('s-location-field');
  let key;
  try {
    const config = await api.get('/maps/config.php');
    key = config.key;
  } catch (e) {
    return; // leave the section hidden
  }
  if (!key) return;

  try {
    await loadGoogleMapsScript(key);
  } catch (e) {
    return;
  }

  field.style.display = 'block';
  pickedLat = null;
  pickedLng = null;

  const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // geographic center of India
  const map = new google.maps.Map(document.getElementById('s-map'), {
    center: defaultCenter,
    zoom: 5,
  });
  const marker = new google.maps.Marker({ position: defaultCenter, map, draggable: true });

  marker.addListener('dragend', () => {
    const pos = marker.getPosition();
    pickedLat = pos.lat();
    pickedLng = pos.lng();
  });

  // The classic google.maps.places.Autocomplete class is closed to new API
  // keys as of March 2025 — this uses its replacement, the
  // PlaceAutocompleteElement web component, which owns its own input
  // (hence the empty <div> host in the markup rather than an <input>).
  const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
  const placeAutocomplete = new PlaceAutocompleteElement();
  document.getElementById('s-location-search').appendChild(placeAutocomplete);
  placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({ fields: ['location'] });
    if (!place.location) return;
    map.setCenter(place.location);
    map.setZoom(16);
    marker.setPosition(place.location);
    pickedLat = place.location.lat();
    pickedLng = place.location.lng();
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setCenter(here);
        map.setZoom(15);
        marker.setPosition(here);
        pickedLat = here.lat;
        pickedLng = here.lng;
      },
      () => {}, // denied/unavailable — keep the default India-wide view
      { timeout: 5000 }
    );
  }
}

async function renderServiceList() {
  const content = document.getElementById('content');
  const [{ services }, { tags }, { areas }, { categories }, { offers }] = await Promise.all([
    api.get('/services/mine.php'),
    api.get('/tags/list.php'),
    api.get('/areas/list.php'),
    api.get('/categories/list.php'),
    api.get('/offers/mine.php'),
  ]);

  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const liveOffers = offers.filter((o) => o.status === 'approved');
  const approvedServices = services.filter((s) => s.status === 'approved');
  // GST/PAN/allocation-proof are required server-side for service_owner only
  // (see services/create.php) — category_manager/super_admin-created services skip
  // them entirely, so this form only asks when it actually applies.
  const needsServiceKyc = (currentUser() || {}).role === 'service_owner';

  content.innerHTML = `
    <div class="top-title">My Service</div>
    <div class="section-title">Analytics</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Services</div>
        <div style="font-size:20px;font-weight:700;">${approvedServices.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ ${services.length} approved</span></div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Live Offers</div>
        <div style="font-size:20px;font-weight:700;">${liveOffers.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ ${offers.length}${pendingOffers.length ? ` · ${pendingOffers.length} pending` : ''}</span></div>
      </div>
    </div>
    <div id="service-items"></div>
    <div class="section-title">Add a service</div>
    <div class="card">
      <form id="service-form">
        <div class="form-field"><label>Service name</label><input type="text" id="s-name" required /></div>
        <div class="form-field"><label>Tagline</label><input type="text" id="s-tagline" maxlength="160" placeholder="A one-line hook, e.g. Delhi's favorite biryani spot" /></div>
        <div class="form-field"><label>Description</label><textarea id="s-description" rows="2"></textarea></div>
        <div class="form-field"><label>Address</label><input type="text" id="s-address" /></div>
        <div class="form-field"><label>Opening hours</label><input type="text" id="s-opening-hours" placeholder="e.g. Mon–Sun, 10 AM–10 PM" /></div>
        <div class="form-field" id="s-location-field" style="display:none;">
          <label>Location (optional)</label>
          <div id="s-location-search" style="margin-bottom:8px;"></div>
          <div id="s-map" style="height:220px;border-radius:10px;border:1px solid var(--border);"></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Drag the pin to fine-tune the exact spot.</div>
        </div>
        <div class="form-field"><label>Phone</label><input type="tel" id="s-phone" /></div>
        <div class="form-field"><label>Email <span style="color:#c0392b;">*</span></label><input type="email" id="s-email" required /></div>
        <div class="form-field"><label>Website</label><input type="url" id="s-website" placeholder="https://" /></div>
        <div class="form-field">
          <label>Tag</label>
          <select id="s-tag">
            <option value="">-</option>
            ${tags.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Area</label>
          <select id="s-area">
            <option value="">-</option>
            ${areas.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Category (optional)</label>
          <select id="s-category">
            <option value="">-</option>
            ${categories.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
          </select>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
            If your service is inside a category, select it so the category manager can review your listing.
          </div>
        </div>
        <div class="form-field"><label>Floor/Unit</label><input type="text" id="s-floor-unit" placeholder="e.g. 2nd Floor, Unit 214" /></div>
        <div class="form-field">
          <label>Service image <span style="color:#c0392b;">*</span></label><input type="file" id="s-logo" accept="image/*" required />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 500x500px and compressed automatically.</div>
        </div>
        ${needsServiceKyc ? `
        <div class="form-field"><label>GSTIN</label><input type="text" id="s-gstin" maxlength="15" style="text-transform:uppercase;" /></div>
        <div class="form-field">
          <label>PAN</label><input type="text" id="s-pan" maxlength="10" style="text-transform:uppercase;" />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Enter at least one of GSTIN or PAN <span style="color:#c0392b;">*</span></div>
        </div>
        <div class="form-field">
          <label>Category-service allocation proof</label>
          <input type="file" id="s-allocation-proof" accept="image/*,application/pdf" required />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">A lease/allotment letter or similar proof that this service operates inside the category you selected above. Image or PDF, up to 10MB.</div>
        </div>` : ''}
        <div class="error-text" id="s-error" style="display:none;"></div>
        <button class="btn" type="submit" id="s-submit">Submit for review</button>
      </form>
    </div>
  `;

  const myId = (currentUser() || {}).id;
  initLocationPicker();

  const itemsEl = document.getElementById('service-items');
  itemsEl.innerHTML = services.length
    ? services
        .map((s) => {
          // A service manager can approve/reject a pending edit their own
          // service_staff submitted — but never one they submitted themselves.
          const canReview = s.status === 'pending'
            && s.last_edited_by !== null
            && String(s.last_edited_by) !== String(myId);
          return `
      <div class="admin-item">
        <a class="list-row" style="flex:1;" href="/sehy_web/my-service.html?service_id=${s.id}&name=${encodeURIComponent(s.name)}">
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
          <button class="btn" style="width:auto;padding:6px 14px;" data-service-approve-id="${s.id}">Approve</button>
          <button class="btn danger" style="width:auto;padding:6px 14px;" data-service-reject-id="${s.id}">Reject</button>
        </div>` : ''}
      </div>`;
        })
        .join('')
    : '<div class="empty-state">You have no services yet. Add one below.</div>';

  itemsEl.querySelectorAll('button[data-service-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_service.php', { id: Number(btn.dataset.serviceApproveId), status: 'approved' });
      renderServiceList();
    });
  });
  itemsEl.querySelectorAll('button[data-service-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejecting this edit:');
      if (!note || !note.trim()) return;
      await api.post('/admin/review_service.php', { id: Number(btn.dataset.serviceRejectId), status: 'rejected', note: note.trim() });
      renderServiceList();
    });
  });

  document.getElementById('service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('s-submit');
    const err = document.getElementById('s-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const fd = new FormData();
      fd.set('name', document.getElementById('s-name').value.trim());
      fd.set('tagline', document.getElementById('s-tagline').value.trim());
      fd.set('description', document.getElementById('s-description').value.trim());
      fd.set('address', document.getElementById('s-address').value.trim());
      fd.set('opening_hours', document.getElementById('s-opening-hours').value.trim());
      fd.set('phone', document.getElementById('s-phone').value.trim());
      fd.set('email', document.getElementById('s-email').value.trim());
      fd.set('website', document.getElementById('s-website').value.trim());
      fd.set('floor_unit', document.getElementById('s-floor-unit').value.trim());
      if (document.getElementById('s-tag').value) fd.set('tag_id', document.getElementById('s-tag').value);
      if (document.getElementById('s-area').value) fd.set('area', document.getElementById('s-area').value);
      const categorySelect = document.getElementById('s-category');
      if (categorySelect && categorySelect.value) fd.set('category_id', categorySelect.value);
      if (pickedLat != null && pickedLng != null) {
        fd.set('latitude', pickedLat);
        fd.set('longitude', pickedLng);
      }
      const logo = document.getElementById('s-logo').files[0];
      if (logo) fd.set('logo', logo);
      if (needsServiceKyc) {
        const gstin = document.getElementById('s-gstin').value.trim().toUpperCase();
        const pan = document.getElementById('s-pan').value.trim().toUpperCase();
        if (!gstin && !pan) throw new Error('Enter at least one of GSTIN or PAN');
        if (gstin) fd.set('gstin', gstin);
        if (pan) fd.set('pan', pan);
        const proof = document.getElementById('s-allocation-proof').files[0];
        if (proof) fd.set('allocation_proof', proof);
      }
      try {
        await api.postForm('/services/create.php', fd);
        renderServiceList();
        return;
      } catch (ex) {
        if (!/one-time listing fee/i.test(ex.message)) throw ex;
      }
      // First service for this owner — the listing fee hasn't been paid yet.
      // Pay it, then retry the exact same submission.
      err.textContent = 'A one-time ₹999 listing fee applies to your first service. Opening payment...';
      err.style.display = 'block';
      await payWithRazorpay({ purpose: 'service_listing', description: 'Sehy service listing fee' });
      await api.postForm('/services/create.php', fd);
      renderServiceList();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });
}

async function renderServiceOffers() {
  const content = document.getElementById('content');
  const [{ offers }, { ads }, { service }] = await Promise.all([
    api.get('/offers/mine.php'),
    api.get('/service_ads/mine.php'),
    api.get('/services/get.php', { id: serviceIdParam }),
  ]);
  const mine = offers.filter((o) => String(o.service_id) === String(serviceIdParam));
  const myAds = ads.filter((a) => String(a.service_id) === String(serviceIdParam));

  // A category manager reaches this page from the manager dashboard's "Manage
  // Offers" link, not from /my-service.html, so send them back there instead.
  const isCategoryManager = (currentUser() || {}).role === 'category_manager';
  const backHref = isCategoryManager ? '/sehy_web/manager-dashboard.html' : '/sehy_web/my-service.html';
  const backLabel = isCategoryManager ? 'Category Manager Dashboard' : 'My Service';

  content.innerHTML = `
    <a class="back-link" href="${backHref}">&larr; ${backLabel}</a>
    <div class="top-title">${escapeHtml(serviceNameParam)}</div>
    <div class="section-title" style="margin-top:0;">Website Traffic (last 30 days) — via Google Analytics</div>
    <div class="card" id="ga-service-panel"><p style="font-size:13px;color:var(--text-muted);">Loading...</p></div>
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
    ${!isCategoryManager ? `
    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
      <span>Service Ads</span>
      <span style="font-size:13px;font-weight:400;color:var(--text-muted);">${service.ad_credits} credit${service.ad_credits === 1 ? '' : 's'} left</span>
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
    <div class="section-title">Service Products</div>
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

  renderGaPanel(document.getElementById('ga-service-panel'), '/analytics/service_report.php', { service_id: serviceIdParam });

  const myId = (currentUser() || {}).id;

  const itemsEl = document.getElementById('offer-items');
  itemsEl.innerHTML = mine.length
    ? mine
        .map((o) => {
          // Only the service manager (not category manager) approves offers, and
          // only ones their own staff submitted — never their own.
          const canReview = !isCategoryManager
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
      renderServiceOffers();
    });
  });

  itemsEl.querySelectorAll('button[data-offer-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_offer.php', { id: Number(btn.dataset.offerApproveId), status: 'approved' });
      renderServiceOffers();
    });
  });
  itemsEl.querySelectorAll('button[data-offer-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_offer.php', { id: Number(btn.dataset.offerRejectId), status: 'rejected' });
      renderServiceOffers();
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
      fd.set('service_id', serviceIdParam);
      fd.set('title', document.getElementById('o-title').value.trim());
      fd.set('description', document.getElementById('o-description').value.trim());
      fd.set('expires_at', document.getElementById('o-expires').value);
      if (document.getElementById('o-original').value) fd.set('original_price', document.getElementById('o-original').value);
      if (document.getElementById('o-discounted').value) fd.set('discounted_price', document.getElementById('o-discounted').value);
      if (document.getElementById('o-percent').value) fd.set('discount_percent', document.getElementById('o-percent').value);
      const image = document.getElementById('o-image').files[0];
      if (image) fd.set('image', image);
      await api.postForm('/offers/create.php', fd);
      renderServiceOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });

  const { products } = await api.get('/service_products/list.php', { service_id: serviceIdParam });
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
      await api.del('/service_products/delete.php', { id: Number(btn.dataset.spDeleteId) });
      renderServiceOffers();
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
      fd.set('service_id', serviceIdParam);
      fd.set('image', image);
      const caption = document.getElementById('sp-caption').value.trim();
      if (caption) fd.set('caption', caption);
      await api.postForm('/service_products/create.php', fd);
      renderServiceOffers();
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
      const res = await fetch(`${API_BASE}/service_whatsapp/export.php?service_id=${serviceIdParam}`, { headers: headers() });
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
      await downloadAuthedFile(`${API_BASE}/service_whatsapp/export.php?service_id=${serviceIdParam}`, 'whatsapp-subscribers.csv');
    } catch (ex) {
      alert(ex.message);
    } finally {
      btn.disabled = false;
    }
  });

  if (isCategoryManager) return;

  document.getElementById('sad-buy-credits').addEventListener('click', async () => {
    const btn = document.getElementById('sad-buy-credits');
    const err = document.getElementById('sad-credit-error');
    err.style.display = 'none';
    const quantity = Number(document.getElementById('sad-credit-qty').value);
    btn.disabled = true;
    btn.textContent = 'Opening payment...';
    try {
      await payWithRazorpay({
        purpose: 'service_ad_credits',
        serviceId: serviceIdParam,
        quantity,
        productName: document.getElementById('sad-credit-product').value.trim(),
        brandName: document.getElementById('sad-credit-brand').value.trim(),
        description: `${quantity} ad credit${quantity === 1 ? '' : 's'} for ${serviceNameParam}`,
      });
      renderServiceOffers();
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
    : '<div class="empty-state">No service ads submitted yet.</div>';

  adItemsEl.querySelectorAll('button[data-sad-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/service_ads/delete.php', { id: Number(btn.dataset.sadDeleteId) });
      renderServiceOffers();
    });
  });
  adItemsEl.querySelectorAll('button[data-sad-approve-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/service_ads/review.php', { id: Number(btn.dataset.sadApproveId), status: 'approved' });
      renderServiceOffers();
    });
  });
  adItemsEl.querySelectorAll('button[data-sad-reject-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejecting this ad:');
      if (!note || !note.trim()) return;
      await api.post('/service_ads/review.php', { id: Number(btn.dataset.sadRejectId), status: 'rejected', note: note.trim() });
      renderServiceOffers();
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
      fd.set('service_id', serviceIdParam);
      fd.set('image', image);
      const link = document.getElementById('sad-link').value.trim();
      if (link) fd.set('link_url', link);
      const product = document.getElementById('sad-product').value.trim();
      if (product) fd.set('product_name', product);
      const brand = document.getElementById('sad-brand').value.trim();
      if (brand) fd.set('brand_name', brand);
      await api.postForm('/service_ads/create.php', fd);
      renderServiceOffers();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });
}

(serviceIdParam ? renderServiceOffers() : renderServiceList()).catch((e) => {
  document.getElementById('content').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
});
