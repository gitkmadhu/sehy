if (!requireLogin('/gmls_web/admin.html')) {
  throw new Error('redirecting to login');
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    document.getElementById('admin-page-title').textContent = btn.querySelector('.tab-label').textContent;
  });
});

function statusTag(status) {
  const labels = { manager_approved: 'Manager approved · awaiting your publish', pending: 'Awaiting first review' };
  return `<span class="chip" style="margin:4px 0 0;">${escapeHtml(labels[status] || status)}</span>`;
}

async function loadPending() {
  const { stores, offers, ads, store_ads, malls, mall_managers } = await api.get('/admin/pending.php');
  return { stores, offers, ads, storeAds: store_ads, malls, mallManagers: mall_managers };
}

function renderSignups(mallManagers) {
  const el = document.getElementById('signup-list');
  el.innerHTML = mallManagers.length
    ? mallManagers
        .map(
          (u) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(u.name)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.email)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.mall_name)}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${u.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${u.id}" data-action="approved">Approve</button>
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No mall manager signups awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_user.php', { id: Number(btn.dataset.id), status: btn.dataset.action });
      refresh();
    });
  });
}

function renderStores(stores) {
  const el = document.getElementById('store-list');
  el.innerHTML = stores.length
    ? stores
        .map(
          (s) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(s.name)}</div>
        ${s.description ? `<p style="margin:6px 0;">${escapeHtml(s.description)}</p>` : ''}
        ${statusTag(s.status)}
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${s.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${s.id}" data-action="approved">Approve &amp; Publish</button>
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No stores awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.id), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this store:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/admin/review_store.php', payload);
      refresh();
    });
  });
}

function renderOffers(offers) {
  const el = document.getElementById('offer-list');
  el.innerHTML = offers.length
    ? offers
        .map(
          (o) => `
      <div class="card">
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(o.store_name)}</div>
        <div style="font-weight:600;">${escapeHtml(o.title)}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${o.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${o.id}" data-action="approved">Approve</button>
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No offers awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_offer.php', { id: Number(btn.dataset.id), status: btn.dataset.action });
      refresh();
    });
  });
}

function renderAds(mallAds, storeAds) {
  const el = document.getElementById('ad-review-list');
  const combined = [
    ...mallAds.map((a) => ({ ...a, kind: 'mall', label: a.mall_name, endpoint: '/mall_ads/review.php' })),
    ...storeAds.map((a) => ({ ...a, kind: 'store', label: a.store_name, endpoint: '/store_ads/review.php' })),
  ];
  el.innerHTML = combined.length
    ? combined
        .map(
          (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div class="name">${a.kind === 'mall' ? '&#127970;' : '&#127978;'} ${escapeHtml(a.label)}</div>
          <div class="sub" style="color:var(--text-muted);">by ${escapeHtml(a.uploaded_by_name || '—')}</div>
          ${statusTag(a.status)}
        </div>
        <button class="btn outline" data-id="${a.id}" data-endpoint="${a.endpoint}" data-action="rejected">Reject</button>
        <button class="btn" data-id="${a.id}" data-endpoint="${a.endpoint}" data-action="approved">Approve &amp; Publish</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No ads awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.id), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this ad:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post(btn.dataset.endpoint, payload);
      refresh();
    });
  });
}

function renderMalls(malls) {
  const el = document.getElementById('mall-review-list');
  if (!el) return;
  // Publishing a mall profile edit is super_admin-only (see
  // admin/review_mall.php) — a plain admin can view what's pending but
  // can't act on it, so skip rendering buttons that would just 403.
  const canManage = currentUser()?.role === 'super_admin';
  el.innerHTML = malls.length
    ? malls
        .map(
          (m) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(m.name)}</div>
        ${m.description ? `<p style="margin:6px 0;">${escapeHtml(m.description)}</p>` : ''}
        ${statusTag(m.status)}
        ${canManage ? `
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${m.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${m.id}" data-action="approved">Approve &amp; Publish</button>
        </div>` : ''}
      </div>`
        )
        .join('')
    : '<div class="empty-state">No mall profile edits awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.id), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this mall profile edit:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/admin/review_mall.php', payload);
      refresh();
    });
  });
}

function renderMessages(messages) {
  const el = document.getElementById('message-list');
  el.innerHTML = messages.length
    ? messages
        .map(
          (m) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div>
            <div style="font-weight:600;">${escapeHtml(m.query_type)}</div>
            <div class="sub" style="color:var(--text-muted);">${escapeHtml(m.user_name)} &middot; ${escapeHtml(m.user_email)}</div>
            ${m.city ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(m.city)}</div>` : ''}
          </div>
          <span class="chip" style="margin:0;${m.status === 'open' ? 'color:var(--primary);border-color:var(--primary);' : ''}">${escapeHtml(m.status)}</span>
        </div>
        <p style="margin:10px 0;">${escapeHtml(m.description)}</p>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(m.created_at)}</div>
        ${m.status === 'open' ? `<button class="btn" style="margin-top:8px;" data-id="${m.id}">Mark resolved</button>` : ''}
      </div>`
        )
        .join('')
    : '<div class="empty-state">No messages yet</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/contact/resolve.php', { id: Number(btn.dataset.id) });
      loadMessages();
    });
  });
}

async function loadMessages() {
  const { messages } = await api.get('/contact/list.php');
  renderMessages(messages);
}

// --- Rate cards, App Banners, City Banners (tiered ad inventory) ---------

function formatRupees(paise) {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatDateTime(v) {
  if (!v) return '';
  return new Date(v.replace(' ', 'T')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toMysqlDatetime(datetimeLocalValue) {
  return datetimeLocalValue ? datetimeLocalValue.replace('T', ' ') + ':00' : '';
}

// Resolves to the currently-running Fri-Sun window if today is already
// inside one (so a last-minute Saturday entry still gets a correct, already
// -started start_at), otherwise the upcoming one.
function computeWeekendRange() {
  const now = new Date();
  const day = now.getDay();
  const fridayOffset = day === 5 ? 0 : day === 6 ? -1 : day === 0 ? -2 : 5 - day;
  const friday = new Date(now);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() + fridayOffset);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 0, 0);
  return { start: friday, end: sunday };
}

// Same idea for the Mon-Thu weekday window.
function computeWeekdayRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? 1 : day >= 1 && day <= 4 ? 1 - day : 8 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  thursday.setHours(23, 59, 0, 0);
  return { start: monday, end: thursday };
}

let rateCardsCache = [];

async function loadRateCards() {
  const { rate_cards } = await api.get('/rate_cards/list.php');
  rateCardsCache = rate_cards;

  const tierLabels = { app_banner: 'App Banners', city_banner: 'City Banners', mall_subscription: 'Mall Subscriptions' };
  const byTier = {};
  rate_cards.forEach((r) => {
    (byTier[r.tier] = byTier[r.tier] || []).push(r);
  });

  // Prices aren't shown/edited here while real payments are on hold (pending
  // GST registration) — super_admin just controls which plan names are
  // active. rate_cards/update.php still supports editing amount/label; this
  // panel just doesn't surface that until pricing is actually actionable.
  const el = document.getElementById('rate-cards-list');
  el.innerHTML = Object.entries(byTier)
    .map(
      ([tier, rows]) => `
    <div style="margin-bottom:14px;">
      <div style="font-weight:600;margin-bottom:6px;">${escapeHtml(tierLabels[tier] || tier)}</div>
      ${rows
        .map((r) => {
          // MySQL's TINYINT comes back through PDO as the string "0"/"1" —
          // "0" is truthy in JS, so a plain `r.is_active ? ...` check here
          // would always read as active regardless of the real value.
          const isActive = Number(r.is_active) === 1;
          return `
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" data-toggle-plan="${escapeHtml(r.plan_key)}" ${isActive ? 'checked' : ''} />
          <div style="flex:1;${isActive ? '' : 'color:var(--text-muted);'}">${escapeHtml(r.label)}</div>
          <span class="chip" style="margin:0;${isActive ? 'color:var(--primary);border-color:var(--primary);' : ''}">${isActive ? 'Active' : 'Inactive'}</span>
        </label>`;
        })
        .join('')}
    </div>`
    )
    .join('');

  el.querySelectorAll('input[data-toggle-plan]').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const planKey = checkbox.dataset.togglePlan;
      const nextState = checkbox.checked;
      checkbox.disabled = true;
      try {
        await api.post('/rate_cards/update.php', { plan_key: planKey, is_active: nextState });
        await loadRateCards();
      } catch (e) {
        alert(e.message);
        checkbox.checked = !nextState;
        checkbox.disabled = false;
      }
    });
  });

  updateBannerFormPrices();
}

function updateBannerFormPrices() {
  const byKey = Object.fromEntries(rateCardsCache.map((r) => [r.plan_key, r]));
  if (byKey.app_weekend) document.getElementById('b-weekend-price').textContent = formatRupees(byKey.app_weekend.amount);
  if (byKey.app_weekday) document.getElementById('b-weekday-price').textContent = formatRupees(byKey.app_weekday.amount);
  if (byKey.city_weekend) document.getElementById('cb-weekend-price').textContent = formatRupees(byKey.city_weekend.amount);
  if (byKey.city_weekday) document.getElementById('cb-weekday-price').textContent = formatRupees(byKey.city_weekday.amount);
}

function wireScheduleControls(prefix) {
  const immediate = document.getElementById(`${prefix}-immediate`);
  const startField = document.getElementById(`${prefix}-start-field`);
  const startInput = document.getElementById(`${prefix}-start`);
  const endInput = document.getElementById(`${prefix}-end`);

  immediate.addEventListener('change', () => {
    startField.style.display = immediate.checked ? 'none' : '';
  });

  const applyRange = (rangeFnToUse) => {
    const { start, end } = rangeFnToUse();
    immediate.checked = false;
    startField.style.display = '';
    startInput.value = toDatetimeLocalValue(start);
    endInput.value = toDatetimeLocalValue(end);
  };

  document.getElementById(`${prefix}-weekend-btn`).addEventListener('click', () => applyRange(computeWeekendRange));
  document.getElementById(`${prefix}-weekday-btn`).addEventListener('click', () => applyRange(computeWeekdayRange));
}

wireScheduleControls('b');
wireScheduleControls('cb');

function windowBadge(status) {
  const colors = { scheduled: 'var(--tertiary)', active: 'var(--primary)', expired: 'var(--text-muted)' };
  return `<span class="chip" style="margin:0 0 6px;color:${colors[status] || 'var(--text-muted)'};border-color:${colors[status] || 'var(--border)'};">${escapeHtml(status)}</span>`;
}

async function loadBanners() {
  const { banners } = await api.get('/banners/list.php');
  const el = document.getElementById('banner-list');
  el.innerHTML = banners.length
    ? banners
        .map(
          (b) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(b.image_url)}" alt="" />
        <div class="info">
          ${windowBadge(b.window_status)}
          <div>${b.link_url ? escapeHtml(b.link_url) : '<span style="color:var(--text-muted);">No link</span>'}</div>
          <div class="sub" style="color:var(--text-muted);">${b.start_at ? 'From ' + formatDateTime(b.start_at) : 'Active immediately'}${b.end_at ? ' until ' + formatDateTime(b.end_at) : ''}</div>
        </div>
        ${b.window_status === 'scheduled' ? `<button class="btn outline" data-publish-id="${b.id}">Publish now</button>` : ''}
        <button class="btn outline" data-edit-id="${b.id}" data-link="${escapeHtml(b.link_url || '')}" data-end="${escapeHtml(b.end_at || '')}">Edit</button>
        <button class="btn danger" data-id="${b.id}">Delete</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No banners yet</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/banners/delete.php', { id: Number(btn.dataset.id) });
      loadBanners();
    });
  });

  el.querySelectorAll('button[data-publish-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fd = new FormData();
      fd.set('id', btn.dataset.publishId);
      fd.set('clear_start', '1');
      await api.postForm('/banners/update.php', fd);
      loadBanners();
    });
  });

  el.querySelectorAll('button[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const link = window.prompt('Link URL:', btn.dataset.link || '');
      if (link === null) return;
      const end = window.prompt('End date/time (YYYY-MM-DD HH:MM, blank = no end):', btn.dataset.end || '');
      if (end === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.editId);
      fd.set('link_url', link.trim());
      if (end.trim()) fd.set('end_at', end.trim());
      else fd.set('clear_end', '1');
      await api.postForm('/banners/update.php', fd);
      loadBanners();
    });
  });
}

document.getElementById('banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('b-submit');
  const err = document.getElementById('b-error');
  err.style.display = 'none';
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.set('image', document.getElementById('b-image').files[0]);
    const link = document.getElementById('b-link').value.trim();
    if (link) fd.set('link_url', link);
    if (!document.getElementById('b-immediate').checked) {
      fd.set('start_at', toMysqlDatetime(document.getElementById('b-start').value));
    }
    const end = document.getElementById('b-end').value;
    if (end) fd.set('end_at', toMysqlDatetime(end));
    await api.postForm('/banners/create.php', fd);
    document.getElementById('banner-form').reset();
    document.getElementById('b-start-field').style.display = 'none';
    loadBanners();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

async function loadCityBanners() {
  const { city_banners } = await api.get('/city_banners/list.php');
  const el = document.getElementById('city-banner-list');
  el.innerHTML = city_banners.length
    ? city_banners
        .map(
          (b) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(b.image_url)}" alt="" />
        <div class="info">
          ${windowBadge(b.window_status)}
          <div style="font-weight:600;">${escapeHtml(b.city)}</div>
          <div>${b.link_url ? escapeHtml(b.link_url) : '<span style="color:var(--text-muted);">No link</span>'}</div>
          <div class="sub" style="color:var(--text-muted);">${b.start_at ? 'From ' + formatDateTime(b.start_at) : 'Active immediately'}${b.end_at ? ' until ' + formatDateTime(b.end_at) : ''}</div>
        </div>
        ${b.window_status === 'scheduled' ? `<button class="btn outline" data-publish-id="${b.id}">Publish now</button>` : ''}
        <button class="btn outline" data-edit-id="${b.id}" data-link="${escapeHtml(b.link_url || '')}" data-end="${escapeHtml(b.end_at || '')}">Edit</button>
        <button class="btn danger" data-id="${b.id}">Delete</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No city banners yet</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/city_banners/delete.php', { id: Number(btn.dataset.id) });
      loadCityBanners();
    });
  });

  el.querySelectorAll('button[data-publish-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fd = new FormData();
      fd.set('id', btn.dataset.publishId);
      fd.set('clear_start', '1');
      await api.postForm('/city_banners/update.php', fd);
      loadCityBanners();
    });
  });

  el.querySelectorAll('button[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const link = window.prompt('Link URL:', btn.dataset.link || '');
      if (link === null) return;
      const end = window.prompt('End date/time (YYYY-MM-DD HH:MM, blank = no end):', btn.dataset.end || '');
      if (end === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.editId);
      fd.set('link_url', link.trim());
      if (end.trim()) fd.set('end_at', end.trim());
      else fd.set('clear_end', '1');
      await api.postForm('/city_banners/update.php', fd);
      loadCityBanners();
    });
  });
}

document.getElementById('city-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('cb-submit');
  const err = document.getElementById('cb-error');
  err.style.display = 'none';
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.set('city', document.getElementById('cb-city').value);
    fd.set('image', document.getElementById('cb-image').files[0]);
    const link = document.getElementById('cb-link').value.trim();
    if (link) fd.set('link_url', link);
    if (!document.getElementById('cb-immediate').checked) {
      fd.set('start_at', toMysqlDatetime(document.getElementById('cb-start').value));
    }
    const end = document.getElementById('cb-end').value;
    if (end) fd.set('end_at', toMysqlDatetime(end));
    await api.postForm('/city_banners/create.php', fd);
    document.getElementById('city-banner-form').reset();
    document.getElementById('cb-start-field').style.display = 'none';
    loadCityBanners();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

let citiesCache = [];

async function loadCities() {
  const { cities } = await api.get('/cities/list.php');
  citiesCache = cities;
  const el = document.getElementById('city-chips');
  el.innerHTML = cities
    .map((c) => `<span class="chip">${escapeHtml(c.name)} <span class="remove" data-id="${c.id}">&times;</span></span>`)
    .join('');
  el.querySelectorAll('.remove').forEach((r) => {
    r.addEventListener('click', async () => {
      const name = r.parentElement.textContent.replace('×', '').trim();
      if (!window.confirm(`Delete "${name}"? This removes it from pickers everywhere; malls/stores already tagged with it are unaffected.`)) return;
      await api.del('/cities/delete.php', { id: Number(r.dataset.id) });
      loadCities();
    });
  });

  const cityOptions = cities.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('m-city').innerHTML = cityOptions;
  document.getElementById('cb-city').innerHTML = cityOptions;
}

document.getElementById('add-city-btn').addEventListener('click', async () => {
  const input = document.getElementById('new-city-name');
  const name = input.value.trim();
  if (!name) return;
  try {
    await api.post('/cities/create.php', { name });
    input.value = '';
    loadCities();
  } catch (e) {
    alert(e.message);
  }
});

function subscriptionStatusText(expiresAt) {
  if (!expiresAt) return 'No active subscription';
  const isFuture = new Date(expiresAt.replace(' ', 'T')).getTime() > Date.now();
  return (isFuture ? 'Active until ' : 'Expired on ') + formatDateTime(expiresAt);
}

async function loadMalls() {
  const { malls } = await api.get('/malls/list.php');
  const canManage = currentUser()?.role === 'super_admin';
  document.getElementById('mall-form-card').style.display = canManage ? '' : 'none';
  const el = document.getElementById('mall-list');
  el.innerHTML = malls.length
    ? malls
        .map(
          (m) => `
      <div class="admin-item">
        ${m.logo_url ? `<img class="thumb" src="${escapeHtml(m.logo_url)}" alt="" />` : '<div class="thumb"></div>'}
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(m.name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(m.city || '')} &middot; ${m.email_domain ? '@' + escapeHtml(m.email_domain) : 'No email domain set'}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(subscriptionStatusText(m.subscription_expires_at))}</div>
        </div>
        ${canManage ? `
        <button class="btn outline" data-sub-id="${m.id}">Manage subscription</button>
        <button class="btn outline" data-edit-id="${m.id}" data-domain="${escapeHtml(m.email_domain || '')}">Edit domain</button>
        <button class="btn danger" data-id="${m.id}">Delete</button>` : ''}
      </div>`
        )
        .join('')
    : '<div class="empty-state">No malls yet</div>';

  if (!canManage) return;

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/malls/delete.php', { id: Number(btn.dataset.id) });
      loadMalls();
    });
  });

  el.querySelectorAll('button[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const domain = window.prompt('Official email domain:', btn.dataset.domain || '');
      if (domain === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.editId);
      fd.set('email_domain', domain.trim());
      await api.postForm('/malls/update.php', fd);
      loadMalls();
    });
  });

  el.querySelectorAll('button[data-sub-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const days = window.prompt('Extend subscription by how many days? (comps from today or the current expiry, whichever is later; leave blank to instead set an exact expiry date)', '30');
      if (days === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.subId);
      if (days.trim()) {
        fd.set('extend_days', days.trim());
      } else {
        const expiry = window.prompt('Set exact expiry (YYYY-MM-DD HH:MM, blank = clear subscription):', '');
        if (expiry === null) return;
        fd.set('subscription_expires_at', expiry.trim());
      }
      await api.postForm('/malls/update.php', fd);
      loadMalls();
    });
  });
}

document.getElementById('mall-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('m-submit');
  const err = document.getElementById('m-error');
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Adding...';
  try {
    const fd = new FormData();
    fd.set('name', document.getElementById('m-name').value.trim());
    fd.set('address', document.getElementById('m-address').value.trim());
    fd.set('city', document.getElementById('m-city').value);
    fd.set('email_domain', document.getElementById('m-domain').value.trim());
    const logo = document.getElementById('m-logo').files[0];
    if (logo) fd.set('logo', logo);
    await api.postForm('/malls/create.php', fd);
    document.getElementById('mall-form').reset();
    loadMalls();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add mall';
  }
});

// --- Overview: City -> Mall -> Store drill-down ---------------------------

function storeRowHtml(s) {
  return `
    <div class="admin-item" style="padding-left:24px;">
      <div class="info">
        <div style="font-weight:600;">${escapeHtml(s.name)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(s.category_name || 'Uncategorized')} &middot; ${escapeHtml(s.owner_name)}</div>
      </div>
      ${statusTag(s.status)}
    </div>`;
}

function mallBlockHtml(m, storesByMall) {
  const mallStores = storesByMall.get(String(m.id)) || [];
  return `
    <details style="margin:8px 0;">
      <summary style="cursor:pointer;font-weight:600;padding:8px 0;">
        ${escapeHtml(m.name)}
        <span class="chip" style="margin-left:6px;">${mallStores.length} store${mallStores.length === 1 ? '' : 's'}</span>
        ${statusTag(m.status)}
      </summary>
      <div class="sub" style="color:var(--text-muted);margin:4px 0 8px;">${escapeHtml(subscriptionStatusText(m.subscription_expires_at))}</div>
      ${mallStores.length ? mallStores.map(storeRowHtml).join('') : '<div class="empty-state">No stores in this mall</div>'}
    </details>`;
}

function statCardHtml(label, value) {
  return `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${value}</div></div>`;
}

async function loadOverview() {
  const el = document.getElementById('overview-list');
  try {
    const [{ cities }, { malls }, { stores }, { offers }, { messages }] = await Promise.all([
      api.get('/cities/list.php'),
      api.get('/malls/list.php'),
      api.get('/admin/stores_all.php'),
      api.get('/offers/list.php'),
      api.get('/contact/list.php'),
    ]);

    document.getElementById('overview-stats').innerHTML = [
      statCardHtml('Malls', malls.length),
      statCardHtml('Stores', stores.length),
      statCardHtml('Active offers', offers.length),
      statCardHtml('Open messages', messages.filter((m) => m.status === 'open').length),
    ].join('');

    const mallsByCity = new Map();
    malls.forEach((m) => {
      const key = m.city || 'No city';
      if (!mallsByCity.has(key)) mallsByCity.set(key, []);
      mallsByCity.get(key).push(m);
    });

    const storesByMall = new Map();
    const unassignedStores = [];
    stores.forEach((s) => {
      if (s.mall_id) {
        const key = String(s.mall_id);
        if (!storesByMall.has(key)) storesByMall.set(key, []);
        storesByMall.get(key).push(s);
      } else {
        unassignedStores.push(s);
      }
    });

    // Cities from cities/list.php (even ones with zero malls yet) plus any
    // mall.city string not found there — malls.city is free text with no FK
    // back to cities.name, so the two can drift.
    const cityNames = new Set(cities.map((c) => c.name));
    mallsByCity.forEach((_malls, key) => cityNames.add(key));
    const orderedCityNames = [...cityNames].sort((a, b) => a.localeCompare(b));

    const cityBlocks = orderedCityNames.map((cityName) => {
      const cityMalls = mallsByCity.get(cityName) || [];
      const storeCount = cityMalls.reduce((sum, m) => sum + (storesByMall.get(String(m.id)) || []).length, 0);
      return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;font-size:16px;">${escapeHtml(cityName)}</div>
          <div class="sub" style="color:var(--text-muted);">${cityMalls.length} mall${cityMalls.length === 1 ? '' : 's'} &middot; ${storeCount} store${storeCount === 1 ? '' : 's'}</div>
        </div>
        ${cityMalls.length ? cityMalls.map((m) => mallBlockHtml(m, storesByMall)).join('') : '<div class="empty-state">No malls in this city yet</div>'}
      </div>`;
    });

    const unassignedBlock = unassignedStores.length
      ? `<div class="card"><div style="font-weight:700;font-size:16px;">No mall</div>${unassignedStores.map(storeRowHtml).join('')}</div>`
      : '';

    el.innerHTML = cityBlocks.length ? cityBlocks.join('') + unassignedBlock : '<div class="empty-state">No cities yet</div>';
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

// --- All Banners: unified view across app/city/mall/store banners --------

function bannerStatusChip(status) {
  const colors = {
    scheduled: 'var(--tertiary)',
    active: 'var(--primary)',
    approved: 'var(--primary)',
    expired: 'var(--text-muted)',
    pending: 'var(--tertiary)',
    manager_approved: 'var(--tertiary)',
    rejected: '#c0392b',
  };
  const color = colors[status] || 'var(--text-muted)';
  return `<span class="chip" style="margin:0;color:${color};border-color:${color};">${escapeHtml(status)}</span>`;
}

let allBannersCache = [];

async function loadAllBanners() {
  const el = document.getElementById('all-banners-list');
  try {
    const { banners, city_banners, mall_ads, store_ads } = await api.get('/admin/banners_all.php');
    allBannersCache = [
      ...banners.map((b) => ({ ...b, type: 'App', scope: 'Platform', status: b.window_status })),
      ...city_banners.map((b) => ({ ...b, type: 'City', scope: b.city, status: b.window_status })),
      ...mall_ads.map((b) => ({ ...b, type: 'Mall', scope: b.mall_name, status: b.status })),
      ...store_ads.map((b) => ({ ...b, type: 'Store', scope: b.store_name, status: b.status })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderAllBanners();
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function renderAllBanners() {
  const el = document.getElementById('all-banners-list');
  const filter = document.getElementById('ab-type-filter').value;
  const rows = filter ? allBannersCache.filter((b) => b.type === filter) : allBannersCache;
  el.innerHTML = rows.length
    ? rows
        .map(
          (b) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(b.image_url)}" alt="" />
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(b.type)} &middot; ${escapeHtml(b.scope || 'Platform')}</div>
          <div class="sub" style="color:var(--text-muted);">${b.link_url ? escapeHtml(b.link_url) : 'No link'}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(formatDateTime(b.created_at))}</div>
        </div>
        ${bannerStatusChip(b.status)}
      </div>`
        )
        .join('')
    : '<div class="empty-state">No banners match this filter</div>';
}

document.getElementById('ab-type-filter').addEventListener('change', renderAllBanners);

// --- Analytics: platform summary + per-mall/per-store drill-in -----------

function loadAnalyticsPlatform() {
  renderGaPanel(document.getElementById('analytics-platform'), '/analytics/platform_report.php', {});
}

async function loadAnalyticsPickers() {
  try {
    const [{ malls }, { stores }] = await Promise.all([
      api.get('/malls/list.php'),
      api.get('/admin/stores_all.php'),
    ]);
    document.getElementById('an-mall-picker').innerHTML =
      '<option value="">Select a mall...</option>' +
      malls.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    document.getElementById('an-store-picker').innerHTML =
      '<option value="">Select a store...</option>' +
      stores.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    // Picker population failing shouldn't block the platform summary above.
  }
}

document.getElementById('an-mall-picker').addEventListener('change', (e) => {
  const mallId = e.target.value;
  document.getElementById('an-store-picker').value = '';
  const detail = document.getElementById('analytics-detail');
  if (!mallId) {
    detail.innerHTML = '';
    return;
  }
  renderGaPanel(detail, '/analytics/mall_report.php', { mall_id: mallId });
});

document.getElementById('an-store-picker').addEventListener('change', (e) => {
  const storeId = e.target.value;
  document.getElementById('an-mall-picker').value = '';
  const detail = document.getElementById('analytics-detail');
  if (!storeId) {
    detail.innerHTML = '';
    return;
  }
  renderGaPanel(detail, '/analytics/store_report.php', { store_id: storeId });
});

// --- Ratings (Google, cached — see backend/lib/google_places.php) --------

function ratingRowHtml(r) {
  const rating = r.google_rating !== null ? Number(r.google_rating).toFixed(1) : null;
  return `
    <div class="admin-item">
      <div class="info">
        <div style="font-weight:600;">${escapeHtml(r.name)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(r.city || '')}</div>
      </div>
      ${rating
        ? `<div style="text-align:right;">
            <div style="font-weight:600;">&#9733; ${rating}</div>
            <div class="sub" style="color:var(--text-muted);">${r.google_rating_count} review${r.google_rating_count === 1 ? '' : 's'}</div>
          </div>`
        : '<span class="chip" style="margin:0;color:var(--text-muted);">Not rated yet</span>'}
    </div>`;
}

async function loadRatings() {
  const storesEl = document.getElementById('ratings-stores');
  const mallsEl = document.getElementById('ratings-malls');
  try {
    const { stores, malls } = await api.get('/admin/ratings_report.php');
    storesEl.innerHTML = stores.length ? stores.map(ratingRowHtml).join('') : '<div class="empty-state">No stores have a Google Place ID yet</div>';
    mallsEl.innerHTML = malls.length ? malls.map(ratingRowHtml).join('') : '<div class="empty-state">No malls have a Google Place ID yet</div>';
  } catch (e) {
    storesEl.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
    mallsEl.innerHTML = '';
  }
}

document.getElementById('ratings-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('ratings-refresh');
  const resultEl = document.getElementById('ratings-refresh-result');
  btn.disabled = true;
  btn.textContent = 'Refreshing...';
  resultEl.textContent = '';
  try {
    const { updated, skipped } = await api.post('/admin/refresh_ratings.php', {});
    resultEl.textContent = `Updated ${updated}, skipped ${skipped}${skipped ? ' (no Places API key configured, or lookup failed)' : ''}.`;
    loadRatings();
  } catch (e) {
    resultEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Refresh Ratings';
  }
});

async function refresh() {
  try {
    const { stores, offers, ads, storeAds, malls, mallManagers } = await loadPending();
    renderStores(stores);
    renderOffers(offers);
    renderAds(ads, storeAds);
    renderMalls(malls);
    renderSignups(mallManagers);
  } catch (e) {
    document.getElementById('store-list').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

refresh();
loadRateCards();
loadBanners();
loadCityBanners();
loadCities();
loadMalls();
loadMessages();
loadOverview();
loadAllBanners();

// --- Super admin: Admins, Payments, Analytics & Reports tabs (hidden entirely for plain admin) ---

function roleLabel(role) {
  return role === 'super_admin' ? 'Super Admin' : 'Admin';
}

async function loadAdmins() {
  const { admins } = await api.get('/admins/list.php');
  const me = currentUser();
  const el = document.getElementById('admins-list');
  el.innerHTML = admins.length
    ? admins
        .map(
          (a) => `
      <div class="admin-item">
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(a.name)} ${a.id === me.id ? '<span class="sub" style="color:var(--text-muted);">(you)</span>' : ''}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(a.email)}${a.phone ? ' &middot; ' + escapeHtml(a.phone) : ''}</div>
          <span class="chip" style="margin:4px 4px 0 0;">${escapeHtml(roleLabel(a.role))}</span>
          <span class="chip" style="margin:4px 0 0;${a.is_active ? 'color:var(--primary);border-color:var(--primary);' : ''}">${a.is_active ? 'Active' : 'Deactivated'}</span>
        </div>
        <button class="btn outline" data-toggle-id="${a.id}" data-active="${a.is_active}">${a.is_active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn danger" data-delete-id="${a.id}">Delete</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No admin accounts yet</div>';

  el.querySelectorAll('button[data-toggle-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api.post('/admins/update.php', { id: Number(btn.dataset.toggleId), is_active: btn.dataset.active !== 'true' });
        loadAdmins();
      } catch (e) {
        alert(e.message);
      }
    });
  });

  el.querySelectorAll('button[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this admin account? This cannot be undone.')) return;
      try {
        await api.del('/admins/delete.php', { id: Number(btn.dataset.deleteId) });
        loadAdmins();
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

const adminForm = document.getElementById('admin-form');
if (adminForm) {
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ad-submit');
    const err = document.getElementById('ad-error');
    err.style.display = 'none';
    btn.disabled = true;
    try {
      await api.post('/admins/create.php', {
        name: document.getElementById('ad-name').value.trim(),
        email: document.getElementById('ad-email').value.trim(),
        phone: document.getElementById('ad-phone').value.trim(),
        password: document.getElementById('ad-password').value,
        role: document.getElementById('ad-role').value,
      });
      adminForm.reset();
      loadAdmins();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });
}

function paymentPurposeLabel(purpose) {
  const labels = { store_listing: 'Store listing', store_ad_credits: 'Store ad credits', mall_subscription: 'Mall subscription' };
  return labels[purpose] || purpose;
}

function renderPaymentsSummary(payments, containerId) {
  const el = document.getElementById(containerId || 'payments-summary');
  const paid = payments.filter((p) => p.status === 'paid');
  const totalPaise = paid.reduce((sum, p) => sum + Number(p.amount), 0);

  const sumBy = (key) => {
    const totals = {};
    paid.forEach((p) => {
      const k = p[key] || 'unknown';
      totals[k] = (totals[k] || 0) + Number(p.amount);
    });
    return totals;
  };
  const byPurpose = sumBy('purpose');
  const byProvider = sumBy('provider');

  const statHtml = (label, value) => `
    <div>
      <p style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 2px;">${label}</p>
      <p style="font-size:18px;font-weight:700;margin:0;">${value}</p>
    </div>`;
  const formatAmount = (paise) => '&#8377;' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  el.innerHTML = `
    <div class="card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;">
      ${statHtml('Total revenue (paid)', formatAmount(totalPaise))}
      ${Object.entries(byPurpose)
        .map(([purpose, paise]) => statHtml(paymentPurposeLabel(purpose), formatAmount(paise)))
        .join('')}
      ${Object.entries(byProvider)
        .map(([provider, paise]) => statHtml(provider === 'revenuecat' ? 'RevenueCat' : 'Razorpay', formatAmount(paise)))
        .join('')}
    </div>`;
}

function paymentRowHtml(p) {
  const statusColor = { paid: 'var(--primary)', created: 'var(--text-muted)', failed: '#c0392b' };
  const extraBits = [];
  if (p.target_name) extraBits.push(escapeHtml(p.target_name) + (p.target_city ? ` (${escapeHtml(p.target_city)})` : ''));
  if (p.product_name) extraBits.push('Product: ' + escapeHtml(p.product_name));
  if (p.brand_name) extraBits.push('Brand: ' + escapeHtml(p.brand_name));
  return `
      <div class="admin-item">
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(p.user_name)} <span class="sub" style="color:var(--text-muted);font-weight:400;">${escapeHtml(p.user_email)}</span></div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(paymentPurposeLabel(p.purpose))}${p.plan_key ? ' &middot; ' + escapeHtml(p.plan_key) : ''}${p.quantity > 1 ? ' &middot; x' + p.quantity : ''}</div>
          ${extraBits.length ? `<div class="sub" style="color:var(--text-muted);">${extraBits.join(' &middot; ')}</div>` : ''}
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(formatDateTime(p.created_at))} &middot; ${escapeHtml(p.provider === 'revenuecat' ? 'RevenueCat' : 'Razorpay')} &middot; <code>${escapeHtml(p.razorpay_order_id || p.revenuecat_transaction_id || '—')}</code></div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:600;">&#8377;${(p.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span class="chip" style="margin:4px 0 0;color:${statusColor[p.status] || 'var(--text-muted)'};border-color:${statusColor[p.status] || 'var(--border)'};">${escapeHtml(p.status)}</span>
        </div>
      </div>`;
}

async function loadPayments() {
  const purpose = document.getElementById('pay-purpose-filter').value;
  const status = document.getElementById('pay-status-filter').value;
  const { payments } = await api.get('/payments/list.php', { purpose, status, limit: 500 });
  renderPaymentsSummary(payments);
  const el = document.getElementById('payments-list');
  el.innerHTML = payments.length
    ? payments.map(paymentRowHtml).join('')
    : '<div class="empty-state">No payments match these filters</div>';
}

// --- Reports: filtered payments export (super_admin only) ----------------

async function loadReportPickers() {
  document.getElementById('rp-city').innerHTML =
    '<option value="">All cities</option>' + citiesCache.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  try {
    const [{ malls }, { stores }] = await Promise.all([
      api.get('/malls/list.php'),
      api.get('/admin/stores_all.php'),
    ]);
    document.getElementById('rp-mall').innerHTML =
      '<option value="">All malls</option>' + malls.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    document.getElementById('rp-store').innerHTML =
      '<option value="">All stores</option>' + stores.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    // Picker population failing shouldn't block filtering by the other fields.
  }
}

let reportRowsCache = [];

async function runReport() {
  const params = {
    date_from: document.getElementById('rp-date-from').value,
    date_to: document.getElementById('rp-date-to').value,
    city: document.getElementById('rp-city').value,
    mall_id: document.getElementById('rp-mall').value,
    store_id: document.getElementById('rp-store').value,
    product_name: document.getElementById('rp-product').value.trim(),
    brand_name: document.getElementById('rp-brand').value.trim(),
    purpose: document.getElementById('rp-purpose').value,
    status: document.getElementById('rp-status').value,
    limit: 500,
  };
  const el = document.getElementById('reports-list');
  el.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const { payments } = await api.get('/payments/list.php', params);
    reportRowsCache = payments;
    renderPaymentsSummary(payments, 'reports-summary');
    el.innerHTML = payments.length
      ? payments.map(paymentRowHtml).join('')
      : '<div class="empty-state">No payments match these filters</div>';
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function exportReportCsv() {
  if (!reportRowsCache.length) {
    alert('Run a report first');
    return;
  }
  const headers = [
    'Timestamp', 'User', 'Email', 'Purpose', 'Plan', 'Product', 'Brand',
    'Target', 'City', 'Provider', 'Order/Transaction ID', 'Amount (INR)', 'Status',
  ];
  const rows = reportRowsCache.map((p) => [
    p.created_at,
    p.user_name,
    p.user_email,
    paymentPurposeLabel(p.purpose),
    p.plan_key || '',
    p.product_name || '',
    p.brand_name || '',
    p.target_name || '',
    p.target_city || '',
    p.provider,
    p.razorpay_order_id || p.revenuecat_transaction_id || '',
    (p.amount / 100).toFixed(2),
    p.status,
  ]);
  const csvEscape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `payments-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

document.getElementById('rp-run').addEventListener('click', runReport);
document.getElementById('rp-export').addEventListener('click', exportReportCsv);

document.getElementById('pay-purpose-filter').addEventListener('change', loadPayments);
document.getElementById('pay-status-filter').addEventListener('change', loadPayments);

// --- Incidents: payment/upload failures, failed logins, RevenueCat webhook
// failures, new signups, etc. (super_admin only) — recorded server-side via
// backend/lib/incidents.php, worked here with root-cause/corrective-action
// notes. ---------------------------------------------------------------

const INCIDENT_TYPE_LABELS = {
  payment_failed: 'Payment failed',
  upload_failed: 'Upload failed',
  new_member: 'New member joined',
  login_failed: 'Login failed',
  revenuecat_webhook_failed: 'RevenueCat webhook failed',
};

function incidentTypeLabel(type) {
  return INCIDENT_TYPE_LABELS[type] || type;
}

async function loadIncidents() {
  const { incidents } = await api.get('/admin/incidents_list.php');
  const filter = document.getElementById('inc-status-filter').value;
  const visible = incidents.filter((i) => {
    if (filter === 'all') return true;
    if (filter) return i.status === filter;
    return i.status !== 'resolved'; // default: open & investigating
  });
  const el = document.getElementById('incidents-list');
  el.innerHTML = visible.length
    ? visible.map(incidentRowHtml).join('')
    : '<div class="empty-state">No incidents match this filter</div>';
}

function incidentRowHtml(i) {
  const severityColor = { critical: '#c0392b', warning: '#b8860b', info: 'var(--text-muted)' };
  const statusColor = { open: '#c0392b', investigating: '#b8860b', resolved: 'var(--primary)' };
  const contextBits = Object.entries(i.context || {})
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`);
  return `
      <div class="admin-item" data-incident-id="${i.id}">
        <div class="info">
          <div style="font-weight:600;">
            ${escapeHtml(incidentTypeLabel(i.type))}
            ${i.occurrences > 1 ? `<span class="sub" style="color:var(--text-muted);font-weight:400;">&times;${i.occurrences}</span>` : ''}
          </div>
          ${contextBits.length ? `<div class="sub" style="color:var(--text-muted);">${contextBits.join(' &middot; ')}</div>` : ''}
          <div class="sub" style="color:var(--text-muted);">First: ${escapeHtml(formatDateTime(i.first_seen_at))} &middot; Last: ${escapeHtml(formatDateTime(i.last_seen_at))}</div>
          ${i.root_cause ? `<div class="sub"><strong>Root cause:</strong> ${escapeHtml(i.root_cause)}</div>` : ''}
          ${i.corrective_action ? `<div class="sub"><strong>Corrective action:</strong> ${escapeHtml(i.corrective_action)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <span class="chip" style="margin:0 0 4px;color:${severityColor[i.severity] || 'var(--text-muted)'};border-color:${severityColor[i.severity] || 'var(--border)'};">${escapeHtml(i.severity)}</span>
          <span class="chip" style="margin:0 0 8px;color:${statusColor[i.status] || 'var(--text-muted)'};border-color:${statusColor[i.status] || 'var(--border)'};">${escapeHtml(i.status)}</span>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${i.status === 'open' ? `<button class="btn outline" style="padding:6px 12px;font-size:12px;" data-incident-action="investigate" data-id="${i.id}">Investigate</button>` : ''}
            ${i.status !== 'resolved' ? `<button class="btn" style="padding:6px 12px;font-size:12px;" data-incident-action="resolve" data-id="${i.id}">Resolve</button>` : ''}
            ${i.status === 'resolved' ? `<button class="btn outline" style="padding:6px 12px;font-size:12px;" data-incident-action="reopen" data-id="${i.id}">Reopen</button>` : ''}
            <button class="btn outline" style="padding:6px 12px;font-size:12px;" data-incident-action="edit-notes" data-id="${i.id}" data-status="${escapeHtml(i.status)}" data-root-cause="${escapeHtml(i.root_cause || '')}" data-corrective-action="${escapeHtml(i.corrective_action || '')}">Edit notes</button>
          </div>
        </div>
      </div>`;
}

async function updateIncident(id, status, extra) {
  await api.post('/admin/incidents_update.php', { id, status, ...extra });
  loadIncidents();
}

document.getElementById('incidents-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-incident-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.incidentAction;

  if (action === 'investigate') {
    updateIncident(id, 'investigating');
  } else if (action === 'resolve') {
    const rootCause = window.prompt('Root cause:', btn.dataset.rootCause || '');
    if (rootCause === null) return;
    const correctiveAction = window.prompt('Corrective action:', btn.dataset.correctiveAction || '');
    if (correctiveAction === null) return;
    updateIncident(id, 'resolved', { root_cause: rootCause.trim(), corrective_action: correctiveAction.trim() });
  } else if (action === 'reopen') {
    updateIncident(id, 'open');
  } else if (action === 'edit-notes') {
    const rootCause = window.prompt('Root cause:', btn.dataset.rootCause || '');
    if (rootCause === null) return;
    const correctiveAction = window.prompt('Corrective action:', btn.dataset.correctiveAction || '');
    if (correctiveAction === null) return;
    updateIncident(id, btn.dataset.status || 'open', { root_cause: rootCause.trim(), corrective_action: correctiveAction.trim() });
  }
});

document.getElementById('inc-status-filter').addEventListener('change', loadIncidents);

(async function initSuperAdminTabs() {
  try {
    const { user } = await api.get('/auth/me.php');
    if (user.role !== 'super_admin') return;
    document.getElementById('tab-btn-admins').style.display = '';
    document.getElementById('tab-btn-payments').style.display = '';
    document.getElementById('tab-btn-analytics').style.display = '';
    document.getElementById('tab-btn-reports').style.display = '';
    document.getElementById('tab-btn-incidents').style.display = '';
    document.getElementById('nav-group-insights').style.display = '';
    document.getElementById('nav-group-platform').style.display = '';
    loadAdmins();
    loadPayments();
    loadAnalyticsPlatform();
    loadAnalyticsPickers();
    loadRatings();
    loadReportPickers();
    loadIncidents();
  } catch (e) {
    // Not signed in as a role that can call /auth/me.php successfully — leave the tabs hidden.
  }
})();
