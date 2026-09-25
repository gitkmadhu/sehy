if (!requireLogin('/sehy_web/admin.html')) {
  throw new Error('redirecting to login');
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    document.getElementById('admin-page-title').textContent = btn.dataset.title || btn.querySelector('.tab-label').textContent;
  });
});

function statusTag(status) {
  const labels = { manager_approved: 'Manager approved · awaiting your publish', pending: 'Awaiting first review' };
  return `<span class="chip" style="margin:4px 0 0;">${escapeHtml(labels[status] || status)}</span>`;
}

async function loadPending() {
  const { services, offers, ads, service_ads, categories, category_managers, unit_managers } = await api.get('/admin/pending.php');
  return { services, offers, ads, serviceAds: service_ads, categories, categoryManagers: category_managers, unitManagers: unit_managers };
}

function renderSignups(categoryManagers, unitManagers = []) {
  const el = document.getElementById('signup-list');
  el.innerHTML = categoryManagers.length
    ? categoryManagers
        .map(
          (u) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(u.name)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.email)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.category_name)}</div>
        <div class="sub" style="color:var(--text-muted);">GSTIN: ${escapeHtml(u.category_gstin || 'not submitted')} &middot; PAN: ${escapeHtml(u.category_pan || 'not submitted')}</div>
        ${kycRegistryHtml(u.category_gst_verified_status, u.category_gst_registry_name, u.category_pan_verified_status, u.category_pan_registry_name)}
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${u.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${u.id}" data-action="approved">Approve</button>
          ${(u.category_gstin || u.category_pan) ? `<button class="btn outline" data-verify-kyc="category" data-verify-id="${u.category_id}">Verify GST/PAN</button>` : ''}
        </div>
      </div>`
        )
        .join('')
    : '';
  el.innerHTML += unitManagers
    .map(
      (u) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(u.name)} <span class="chip">Unit Manager</span></div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.email)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.unit_name)}</div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${u.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${u.id}" data-action="approved">Approve</button>
        </div>
      </div>`
    )
    .join('');
  if (!categoryManagers.length && !unitManagers.length) {
    el.innerHTML = '<div class="empty-state">No manager signups awaiting review</div>';
  }

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.post('/admin/review_user.php', { id: Number(btn.dataset.id), status: btn.dataset.action });
      refresh();
    });
  });
  bindKycVerifyButtons(el, refresh);
}

/** Shared by renderSignups/renderServices — shows the paid registry lookup's result, if it's been run. */
function kycRegistryHtml(gstStatus, gstName, panStatus, panName) {
  if (!gstStatus && !panStatus) return '';
  const parts = [];
  if (gstStatus) parts.push(`GST registry: ${escapeHtml(gstStatus)}${gstName ? ` — ${escapeHtml(gstName)}` : ''}`);
  if (panStatus) parts.push(`PAN registry: ${escapeHtml(panStatus)}${panName ? ` — ${escapeHtml(panName)}` : ''}`);
  return `<div class="sub" style="color:var(--primary);">${parts.join(' &middot; ')}</div>`;
}

/** Shared click-wiring for the "Verify GST/PAN" button in both renderSignups and renderServices. */
function bindKycVerifyButtons(container, onDone) {
  container.querySelectorAll('button[data-verify-kyc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      try {
        const result = await api.post('/admin/verify_kyc.php', {
          entity_type: btn.dataset.verifyKyc,
          id: Number(btn.dataset.verifyId),
        });
        if (result.configured === false) {
          alert('GST/PAN registry verification isn\'t set up yet.');
          btn.disabled = false;
          btn.textContent = 'Verify GST/PAN';
          return;
        }
        onDone();
      } catch (ex) {
        alert(ex.message);
        btn.disabled = false;
        btn.textContent = 'Verify GST/PAN';
      }
    });
  });
}

function renderServices(services) {
  const el = document.getElementById('service-list');
  el.innerHTML = services.length
    ? services
        .map(
          (s) => `
      <div class="card">
        <div style="font-weight:600;">${escapeHtml(s.name)}</div>
        ${s.description ? `<p style="margin:6px 0;">${escapeHtml(s.description)}</p>` : ''}
        ${statusTag(s.status)}
        <div class="sub" style="color:var(--text-muted);">GSTIN: ${escapeHtml(s.gstin || 'not submitted')} &middot; PAN: ${escapeHtml(s.pan || 'not submitted')}</div>
        ${kycRegistryHtml(s.gst_verified_status, s.gst_registry_name, s.pan_verified_status, s.pan_registry_name)}
        <div class="sub" style="color:var(--text-muted);">
          Allocation proof: ${s.allocation_proof_url
            ? `<a href="${escapeHtml(s.allocation_proof_url)}" target="_blank" rel="noopener">View document</a>`
            : 'not submitted'}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn outline" data-id="${s.id}" data-action="rejected">Reject</button>
          <button class="btn" data-id="${s.id}" data-action="approved">Approve &amp; Publish</button>
          ${(s.gstin || s.pan) ? `<button class="btn outline" data-verify-kyc="service" data-verify-id="${s.id}">Verify GST/PAN</button>` : ''}
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No services awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.id), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this service:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/admin/review_service.php', payload);
      refresh();
    });
  });
  bindKycVerifyButtons(el, refresh);
}

function renderOffers(offers) {
  const el = document.getElementById('offer-list');
  el.innerHTML = offers.length
    ? offers
        .map(
          (o) => `
      <div class="card">
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(o.service_name)}</div>
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

function renderAds(categoryAds, serviceAds) {
  const el = document.getElementById('ad-review-list');
  const combined = [
    ...categoryAds.map((a) => ({ ...a, kind: 'category', label: a.category_name, endpoint: '/category_ads/review.php' })),
    ...serviceAds.map((a) => ({ ...a, kind: 'service', label: a.service_name, endpoint: '/service_ads/review.php' })),
  ];
  el.innerHTML = combined.length
    ? combined
        .map(
          (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div class="name">${a.kind === 'category' ? '&#127970;' : '&#127978;'} ${escapeHtml(a.label)}</div>
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

function renderCategories(categories) {
  const el = document.getElementById('category-review-list');
  if (!el) return;
  // Publishing a category profile edit is super_admin-only (see
  // admin/review_category.php) — a plain admin can view what's pending but
  // can't act on it, so skip rendering buttons that would just 403.
  const canManage = currentUser()?.role === 'super_admin';
  el.innerHTML = categories.length
    ? categories
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
    : '<div class="empty-state">No category profile edits awaiting review</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.id), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this category profile edit:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/admin/review_category.php', payload);
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
            ${m.area ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(m.area)}</div>` : ''}
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

// --- Owner Chat: WhatsApp-styled admin-to-owner messaging ----------------

let ownerChatOwners = [];
let ownerChatSelectedId = null;

function ownerChatInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function renderOwnerChatList(filter = '') {
  const el = document.getElementById('oc-owner-list');
  const needle = filter.trim().toLowerCase();
  const owners = needle
    ? ownerChatOwners.filter((o) =>
        [o.name, o.email, o.category_name, o.service_name].some((v) => (v || '').toLowerCase().includes(needle))
      )
    : ownerChatOwners;

  el.innerHTML = owners.length
    ? owners
        .map(
          (o) => `
      <div class="oc-owner-row${o.id === ownerChatSelectedId ? ' active' : ''}" data-id="${o.id}">
        <div class="oc-owner-avatar">${escapeHtml(ownerChatInitial(o.name))}</div>
        <div class="oc-owner-meta">
          <div class="oc-owner-name">${escapeHtml(o.name)}</div>
          <div class="oc-owner-sub">${escapeHtml(o.category_name || o.service_name || o.email)}</div>
        </div>
        <span class="oc-owner-role">${o.role === 'category_manager' ? 'Category' : 'Service'}</span>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No owners found</div>';

  el.querySelectorAll('.oc-owner-row[data-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const owner = ownerChatOwners.find((o) => String(o.id) === row.dataset.id);
      if (owner) selectOwnerChat(owner);
    });
  });
}

async function loadOwnerChatOwners() {
  const { owners } = await api.get('/admin/owners_list.php');
  ownerChatOwners = owners;
  renderOwnerChatList(document.getElementById('oc-search').value);
}

function renderOwnerChatBubbles(messages) {
  const el = document.getElementById('oc-bubbles');
  el.innerHTML = messages.length
    ? messages
        .map(
          (m) => `
      <div class="oc-bubble${m.type === 'owner_message' ? ' oc-bubble-in' : ''}">
        ${escapeHtml(m.body)}
        <span class="oc-bubble-time">${formatDateTime(m.created_at)}</span>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No messages yet. Say hello!</div>';
  el.scrollTop = el.scrollHeight;
}

async function loadOwnerChatThread(userId) {
  const { messages } = await api.get('/admin/owner_message_thread.php', { user_id: userId });
  renderOwnerChatBubbles(messages);
}

function selectOwnerChat(owner) {
  ownerChatSelectedId = owner.id;
  renderOwnerChatList(document.getElementById('oc-search').value);
  document.getElementById('oc-thread-header').innerHTML = `
    ${escapeHtml(owner.name)}
    <div class="oc-header-sub">${escapeHtml(owner.category_name || owner.service_name || owner.email)}</div>`;
  document.getElementById('oc-composer').style.display = 'flex';
  loadOwnerChatThread(owner.id);
}

document.getElementById('oc-search').addEventListener('input', (e) => {
  renderOwnerChatList(e.target.value);
});

document.getElementById('oc-composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ownerChatSelectedId) return;
  const input = document.getElementById('oc-input');
  const message = input.value.trim();
  if (!message) return;
  const btn = document.getElementById('oc-send');
  btn.disabled = true;
  try {
    await api.post('/admin/owner_message_send.php', { user_id: ownerChatSelectedId, message });
    input.value = '';
    loadOwnerChatThread(ownerChatSelectedId);
  } catch (ex) {
    window.alert(ex.message);
  } finally {
    btn.disabled = false;
  }
});

// --- Rate cards, App Banners, Area Banners (tiered ad inventory) ---------

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

  const tierLabels = { app_banner: 'App Banners', area_banner: 'Area Banners', category_subscription: 'Category Subscriptions' };
  const byTier = {};
  rate_cards.forEach((r) => {
    (byTier[r.tier] = byTier[r.tier] || []).push(r);
  });

  // Prices aren't shown/edited here while real payments are on hold (pending
  // GST registration) — just the plan name and its active/inactive status.
  // Only super_admin can change that status (rate_cards/update.php); plain
  // admin sees it read-only, no checkbox at all.
  const canManage = currentUser()?.role === 'super_admin';
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
          const statusChip = `<span class="chip" style="margin:0;${isActive ? 'color:var(--primary);border-color:var(--primary);' : ''}">${isActive ? 'Active' : 'Inactive'}</span>`;
          if (!canManage) {
            return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="flex:1;${isActive ? '' : 'color:var(--text-muted);'}">${escapeHtml(r.label)}</div>
          ${statusChip}
        </div>`;
          }
          return `
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" data-toggle-plan="${escapeHtml(r.plan_key)}" ${isActive ? 'checked' : ''} />
          <div style="flex:1;${isActive ? '' : 'color:var(--text-muted);'}">${escapeHtml(r.label)}</div>
          ${statusChip}
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
  // App Banner buttons no longer show a price (payments on hold pending
  // GST) — Area Banner still does until asked to match.
  const byKey = Object.fromEntries(rateCardsCache.map((r) => [r.plan_key, r]));
  if (byKey.area_weekend) document.getElementById('cb-weekend-price').textContent = formatRupees(byKey.area_weekend.amount);
  if (byKey.area_weekday) document.getElementById('cb-weekday-price').textContent = formatRupees(byKey.area_weekday.amount);
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

  el.querySelectorAll('button[data-rename-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = window.prompt('Category name:', btn.dataset.name || '');
      if (name === null || !name.trim()) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.renameId);
      fd.set('name', name.trim());
      await api.postForm('/categories/update.php', fd);
      loadCategories();
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

async function loadAreaBanners() {
  const { area_banners } = await api.get('/area_banners/list.php');
  const el = document.getElementById('area-banner-list');
  el.innerHTML = area_banners.length
    ? area_banners
        .map(
          (b) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(b.image_url)}" alt="" />
        <div class="info">
          ${windowBadge(b.window_status)}
          <div style="font-weight:600;">${escapeHtml(b.area)}</div>
          <div>${b.link_url ? escapeHtml(b.link_url) : '<span style="color:var(--text-muted);">No link</span>'}</div>
          <div class="sub" style="color:var(--text-muted);">${b.start_at ? 'From ' + formatDateTime(b.start_at) : 'Active immediately'}${b.end_at ? ' until ' + formatDateTime(b.end_at) : ''}</div>
        </div>
        ${b.window_status === 'scheduled' ? `<button class="btn outline" data-publish-id="${b.id}">Publish now</button>` : ''}
        <button class="btn outline" data-edit-id="${b.id}" data-link="${escapeHtml(b.link_url || '')}" data-end="${escapeHtml(b.end_at || '')}">Edit</button>
        <button class="btn danger" data-id="${b.id}">Delete</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No area banners yet</div>';

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.del('/area_banners/delete.php', { id: Number(btn.dataset.id) });
      loadAreaBanners();
    });
  });

  el.querySelectorAll('button[data-publish-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fd = new FormData();
      fd.set('id', btn.dataset.publishId);
      fd.set('clear_start', '1');
      await api.postForm('/area_banners/update.php', fd);
      loadAreaBanners();
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
      await api.postForm('/area_banners/update.php', fd);
      loadAreaBanners();
    });
  });
}

document.getElementById('area-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('cb-submit');
  const err = document.getElementById('cb-error');
  err.style.display = 'none';
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.set('area', document.getElementById('cb-area').value);
    fd.set('image', document.getElementById('cb-image').files[0]);
    const link = document.getElementById('cb-link').value.trim();
    if (link) fd.set('link_url', link);
    if (!document.getElementById('cb-immediate').checked) {
      fd.set('start_at', toMysqlDatetime(document.getElementById('cb-start').value));
    }
    const end = document.getElementById('cb-end').value;
    if (end) fd.set('end_at', toMysqlDatetime(end));
    await api.postForm('/area_banners/create.php', fd);
    document.getElementById('area-banner-form').reset();
    document.getElementById('cb-start-field').style.display = 'none';
    loadAreaBanners();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

// --- Category Banners: super_admin publishing directly for any category ----------

let categoryBannerCategoriesCache = [];

async function loadCategoryBannerCategoryPicker() {
  const { categories } = await api.get('/categories/list.php');
  categoryBannerCategoriesCache = categories;
  document.getElementById('mb-category-options').innerHTML = categories
    .map((m) => `<option value="${escapeHtml(m.name)}"></option>`)
    .join('');
}

async function loadCategoryBanners() {
  const el = document.getElementById('category-banner-list');
  try {
    const { category_ads } = await api.get('/admin/banners_all.php');
    el.innerHTML = category_ads.length
      ? category_ads
          .map(
            (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(a.category_name)}</div>
          <div>${a.link_url ? escapeHtml(a.link_url) : '<span style="color:var(--text-muted);">No link</span>'}</div>
          ${statusTag(a.status)}
        </div>
        <button class="btn danger" data-id="${a.id}">Delete</button>
      </div>`
          )
          .join('')
      : '<div class="empty-state">No category banners yet</div>';

    el.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.del('/category_ads/delete.php', { id: Number(btn.dataset.id) });
        loadCategoryBanners();
      });
    });
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('category-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('mb-submit');
  const err = document.getElementById('mb-error');
  err.style.display = 'none';
  const category = categoryBannerCategoriesCache.find((m) => m.name === document.getElementById('mb-category').value);
  if (!category) {
    err.textContent = 'Select a category from the list';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.set('category_id', category.id);
    fd.set('image', document.getElementById('mb-image').files[0]);
    const link = document.getElementById('mb-link').value.trim();
    if (link) fd.set('link_url', link);
    await api.postForm('/category_ads/create.php', fd);
    document.getElementById('category-banner-form').reset();
    loadCategoryBanners();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

let areasCache = [];

async function loadAreas() {
  const { areas } = await api.get('/areas/list.php');
  areasCache = areas;
  // Adding/removing areas is super_admin-only (see areas/create.php,
  // areas/delete.php) — plain admin sees the list read-only.
  const canManage = currentUser()?.role === 'super_admin';
  document.getElementById('add-area-btn').style.display = canManage ? '' : 'none';
  document.getElementById('new-area-name').style.display = canManage ? '' : 'none';
  const el = document.getElementById('area-chips');
  el.innerHTML = areas
    .map((c) => `<span class="chip">${escapeHtml(c.name)} ${canManage ? `<span class="remove" data-id="${c.id}">&times;</span>` : ''}</span>`)
    .join('');
  el.querySelectorAll('.remove').forEach((r) => {
    r.addEventListener('click', async () => {
      const name = r.parentElement.textContent.replace('×', '').trim();
      if (!window.confirm(`Delete "${name}"? This removes it from pickers everywhere; categories/services already tagged with it are unaffected.`)) return;
      await api.del('/areas/delete.php', { id: Number(r.dataset.id) });
      loadAreas();
    });
  });

  const areaOptions = areas.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('cb-area').innerHTML = areaOptions;
}

document.getElementById('add-area-btn').addEventListener('click', async () => {
  const input = document.getElementById('new-area-name');
  const name = input.value.trim();
  if (!name) return;
  try {
    await api.post('/areas/create.php', { name });
    input.value = '';
    loadAreas();
  } catch (e) {
    alert(e.message);
  }
});

// --- Units: the level between a category and its shops ---------------------------

let unitsCache = [];

const UNIT_STATUS_LABELS = {
  pending: 'Awaiting unit manager',
  manager_approved: 'Manager approved · awaiting publish',
  approved: 'Published',
  rejected: 'Rejected',
};

function renderUnitReviewList(units) {
  const el = document.getElementById('unit-review-list');
  const waiting = units.filter((u) => u.status === 'pending' || u.status === 'manager_approved');
  el.innerHTML = waiting.length
    ? waiting
        .map(
          (u) => `
      <div class="admin-item">
        <div class="info">
          <a href="/sehy_web/unit.html?id=${u.id}" style="font-weight:600;color:var(--primary);">${escapeHtml(u.name)}</a>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.category_name)} &middot; ${escapeHtml(UNIT_STATUS_LABELS[u.status])}</div>
        </div>
        <button class="btn outline" data-unit-review="${u.id}" data-status="rejected">Reject</button>
        <button class="btn" data-unit-review="${u.id}" data-status="approved">Approve &amp; publish</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No unit profile edits awaiting approval</div>';
  el.querySelectorAll('[data-unit-review]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const body = { id: Number(btn.dataset.unitReview), status: btn.dataset.status };
      if (body.status === 'rejected') {
        const note = window.prompt('Reason for rejecting:');
        if (!note || !note.trim()) return;
        body.note = note.trim();
      }
      try { await api.post('/units/review.php', body); loadUnits(); } catch (e) { alert(e.message); }
    });
  });
}

async function loadUnits() {
  const [{ units }, { categories }, { services }] = await Promise.all([
    api.get('/units/list.php', { all: 1 }),
    api.get('/categories/list.php'),
    api.get('/admin/services_all.php'),
  ]);
  unitsCache = units;
  renderUnitReviewList(units);
  document.getElementById('unit-category').innerHTML = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join('');

  const el = document.getElementById('unit-list');
  el.innerHTML = units.length
    ? units
        .map(
          (u) => `
      <div class="admin-item" data-id="${u.id}">
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(u.name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(u.category_name)} &middot; ${escapeHtml(UNIT_STATUS_LABELS[u.status] || u.status)} &middot; ${u.service_count} approved ${Number(u.service_count) === 1 ? 'shop' : 'shops'}${u.description ? ' &middot; ' + escapeHtml(u.description) : ''}</div>
        </div>
        <button class="btn outline unit-rename">Rename</button>
        <button class="btn danger unit-delete">Delete</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No units yet — add one above.</div>';

  el.querySelectorAll('.admin-item').forEach((row) => {
    const id = Number(row.dataset.id);
    const unit = unitsCache.find((u) => Number(u.id) === id);
    row.querySelector('.unit-rename').addEventListener('click', async () => {
      const name = window.prompt('Unit name:', unit.name);
      if (name === null || !name.trim()) return;
      try { await api.post('/units/update.php', { id, name: name.trim() }); loadUnits(); } catch (e) { alert(e.message); }
    });
    row.querySelector('.unit-delete').addEventListener('click', async () => {
      if (!window.confirm(`Delete "${unit.name}"? Its shops stay in the category but are no longer in a unit.`)) return;
      try { await api.del('/units/delete.php', { id }); loadUnits(); } catch (e) { alert(e.message); }
    });
  });

  const assignEl = document.getElementById('unit-assign-list');
  assignEl.innerHTML = services.length
    ? services
        .map((s) => {
          const options = units
            .map((u) => `<option value="${u.id}" ${String(u.id) === String(s.unit_id) ? 'selected' : ''}>${escapeHtml(u.category_name)} › ${escapeHtml(u.name)}</option>`)
            .join('');
          return `
      <div class="admin-item">
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(s.name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(s.status)}</div>
        </div>
        <select data-service-id="${s.id}"><option value="">No unit</option>${options}</select>
      </div>`;
        })
        .join('')
    : '<div class="empty-state">No shops yet</div>';
  assignEl.querySelectorAll('select[data-service-id]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try {
        await api.post('/units/assign.php', { service_id: Number(sel.dataset.serviceId), unit_id: sel.value ? Number(sel.value) : null });
        loadUnits();
      } catch (e) { alert(e.message); }
    });
  });
}

document.getElementById('unit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('unit-error');
  errorEl.style.display = 'none';
  try {
    await api.post('/units/create.php', {
      category_id: Number(document.getElementById('unit-category').value),
      name: document.getElementById('unit-name').value,
      description: document.getElementById('unit-description').value,
    });
    document.getElementById('unit-name').value = '';
    document.getElementById('unit-description').value = '';
    loadUnits();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
});

loadUnits();

// --- Unit banners & Sub-unit banners: admin publishes directly ------------------

async function loadUnitBanners() {
  const el = document.getElementById('unit-banner-list');
  try {
    const [{ units }, { unit_ads }] = await Promise.all([
      api.get('/units/list.php', { all: 1 }),
      api.get('/admin/banners_all.php'),
    ]);
    document.getElementById('ub-unit').innerHTML = units
      .map((u) => `<option value="${u.id}">${escapeHtml(u.category_name)} › ${escapeHtml(u.name)}</option>`)
      .join('');
    el.innerHTML = unit_ads.length
      ? unit_ads
          .map(
            (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(a.unit_name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(a.link_url || 'No link')}</div>
        </div>
        <button class="btn danger" data-unit-ad="${a.id}">Delete</button>
      </div>`
          )
          .join('')
      : '<div class="empty-state">No unit banners yet</div>';
    el.querySelectorAll('[data-unit-ad]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this banner?')) return;
        await api.del('/unit_ads/delete.php', { id: Number(btn.dataset.unitAd) });
        loadUnitBanners();
      });
    });
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('unit-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('ub-error');
  errEl.style.display = 'none';
  try {
    const fd = new FormData();
    fd.set('unit_id', document.getElementById('ub-unit').value);
    fd.set('image', document.getElementById('ub-image').files[0]);
    fd.set('link_url', document.getElementById('ub-link').value.trim());
    await api.postForm('/unit_ads/create.php', fd);
    e.target.reset();
    loadUnitBanners();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

async function loadSubunitBanners() {
  const el = document.getElementById('subunit-banner-list');
  try {
    const [{ services }, { service_ads }] = await Promise.all([
      api.get('/admin/services_all.php'),
      api.get('/admin/banners_all.php'),
    ]);
    document.getElementById('sb-service').innerHTML = services
      .map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
      .join('');
    el.innerHTML = service_ads.length
      ? service_ads
          .map(
            (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(a.service_name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(a.status)} &middot; ${escapeHtml(a.link_url || 'No link')}</div>
        </div>
        <button class="btn danger" data-service-ad="${a.id}">Delete</button>
      </div>`
          )
          .join('')
      : '<div class="empty-state">No sub-unit banners yet</div>';
    el.querySelectorAll('[data-service-ad]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this banner?')) return;
        await api.del('/service_ads/delete.php', { id: Number(btn.dataset.serviceAd) });
        loadSubunitBanners();
      });
    });
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('subunit-banner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('sb-error');
  errEl.style.display = 'none';
  try {
    const fd = new FormData();
    fd.set('service_id', document.getElementById('sb-service').value);
    fd.set('image', document.getElementById('sb-image').files[0]);
    fd.set('link_url', document.getElementById('sb-link').value.trim());
    await api.postForm('/service_ads/create.php', fd);
    e.target.reset();
    loadSubunitBanners();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

loadUnitBanners();
loadSubunitBanners();

function subscriptionStatusText(expiresAt) {
  if (!expiresAt) return 'No active subscription';
  const isFuture = new Date(expiresAt.replace(' ', 'T')).getTime() > Date.now();
  return (isFuture ? 'Active until ' : 'Expired on ') + formatDateTime(expiresAt);
}

async function loadCategories() {
  const { categories } = await api.get('/categories/list.php');
  const canManage = currentUser()?.role === 'super_admin';
  document.getElementById('category-form-card').style.display = canManage ? '' : 'none';
  const el = document.getElementById('category-list');
  el.innerHTML = categories.length
    ? categories
        .map(
          (m) => `
      <div class="admin-item">
        ${m.logo_url ? `<img class="thumb" src="${escapeHtml(m.logo_url)}" alt="" />` : '<div class="thumb"></div>'}
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(m.name)}</div>
          <div class="sub" style="color:var(--text-muted);">${m.description ? escapeHtml(m.description) + ' &middot; ' : ''}${m.email_domain ? '@' + escapeHtml(m.email_domain) : 'No email domain set'}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(subscriptionStatusText(m.subscription_expires_at))}</div>
        </div>
        ${canManage ? `
        <button class="btn outline" data-rename-id="${m.id}" data-name="${escapeHtml(m.name)}">Rename</button>
        <button class="btn outline" data-sub-id="${m.id}">Manage subscription</button>
        <button class="btn outline" data-edit-id="${m.id}" data-domain="${escapeHtml(m.email_domain || '')}">Edit domain</button>
        <button class="btn danger" data-id="${m.id}">Delete</button>` : ''}
      </div>`
        )
        .join('')
    : '<div class="empty-state">No categories yet</div>';

  if (!canManage) return;

  el.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this category? Services in it will be left without a category, and its home page sections are removed.')) return;
      await api.del('/categories/delete.php', { id: Number(btn.dataset.id) });
      loadCategories();
    });
  });

  el.querySelectorAll('button[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const domain = window.prompt('Official email domain:', btn.dataset.domain || '');
      if (domain === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.editId);
      fd.set('email_domain', domain.trim());
      await api.postForm('/categories/update.php', fd);
      loadCategories();
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
      await api.postForm('/categories/update.php', fd);
      loadCategories();
    });
  });
}

document.getElementById('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('m-submit');
  const err = document.getElementById('m-error');
  err.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Adding...';
  try {
    const fd = new FormData();
    fd.set('name', document.getElementById('m-name').value.trim());
    fd.set('description', document.getElementById('m-description').value.trim());
    fd.set('email_domain', document.getElementById('m-domain').value.trim());
    const logo = document.getElementById('m-logo').files[0];
    if (logo) fd.set('logo', logo);
    await api.postForm('/categories/create.php', fd);
    document.getElementById('category-form').reset();
    loadCategories();
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add category';
  }
});

// --- Overview: Area -> Category -> Service cascading picker ---------------------

function statCardHtml(label, value) {
  return `<div class="stat-card"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${value}</div></div>`;
}

let overviewCategories = [];
let overviewServices = [];
let overviewOffers = [];
let overviewAreaNames = [];
let overviewCurrentAreaCategories = [];
let overviewCurrentCategoryServices = [];

function resetOverviewCategoryService() {
  const categoryInput = document.getElementById('ov-category');
  const serviceInput = document.getElementById('ov-service');
  categoryInput.value = '';
  categoryInput.disabled = true;
  document.getElementById('ov-category-options').innerHTML = '';
  serviceInput.value = '';
  serviceInput.disabled = true;
  document.getElementById('ov-service-options').innerHTML = '';
  overviewCurrentAreaCategories = [];
  overviewCurrentCategoryServices = [];
  document.getElementById('overview-service-detail').innerHTML = '<div class="empty-state">Pick an area, category, and service to see its details</div>';
}

async function loadOverview() {
  const detailEl = document.getElementById('overview-service-detail');
  try {
    const [{ areas }, { categories }, { services }, { offers }, { messages }] = await Promise.all([
      api.get('/areas/list.php'),
      api.get('/categories/list.php'),
      api.get('/admin/services_all.php'),
      api.get('/offers/list.php'),
      api.get('/contact/list.php'),
    ]);

    document.getElementById('overview-stats').innerHTML = [
      statCardHtml('Categories', categories.length),
      statCardHtml('Services', services.length),
      statCardHtml('Active offers', offers.length),
      statCardHtml('Open messages', messages.filter((m) => m.status === 'open').length),
    ].join('');

    overviewCategories = categories;
    overviewServices = services;
    overviewOffers = offers;

    // Areas from areas/list.php (even ones with zero categories yet) plus any
    // category.area string not found there — categories.area is free text with no FK
    // back to areas.name, so the two can drift.
    const areaNames = new Set(areas.map((c) => c.name));
    categories.forEach((m) => { if (m.area) areaNames.add(m.area); });
    overviewAreaNames = [...areaNames].sort((a, b) => a.localeCompare(b));

    document.getElementById('ov-area-options').innerHTML =
      overviewAreaNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
    document.getElementById('ov-area').value = '';

    resetOverviewCategoryService();
  } catch (e) {
    detailEl.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function categoryListHtml(areaCategories, area) {
  if (!areaCategories.length) return '<div class="empty-state">No categories yet</div>';
  return areaCategories
    .map((m) => {
      const serviceCount = overviewServices.filter((s) => String(s.category_id) === String(m.id) && (!area || s.area === area)).length;
      return `
      <div class="admin-item">
        ${m.logo_url ? `<img class="thumb" src="${escapeHtml(m.logo_url)}" alt="" />` : '<div class="thumb"></div>'}
        <div class="info">
          <a href="/sehy_web/category.html?id=${m.id}" style="font-weight:600;color:var(--primary);">${escapeHtml(m.name)}</a>
          <div class="sub" style="color:var(--text-muted);">${serviceCount} service${serviceCount === 1 ? '' : 's'} &middot; ${escapeHtml(subscriptionStatusText(m.subscription_expires_at))}</div>
        </div>
        ${statusTag(m.status)}
      </div>`;
    })
    .join('');
}

function serviceListHtml(categoryServices) {
  if (!categoryServices.length) return '<div class="empty-state">No services in this category yet</div>';
  return categoryServices
    .map(
      (s) => `
      <div class="admin-item">
        <div class="info">
          <a href="/sehy_web/service.html?id=${s.id}" style="font-weight:600;color:var(--primary);">${escapeHtml(s.name)}</a>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(s.tag_name || 'Uncategorized')} &middot; ${escapeHtml(s.owner_name || '')}</div>
        </div>
        ${statusTag(s.status)}
      </div>`
    )
    .join('');
}

document.getElementById('ov-area').addEventListener('input', (e) => {
  const area = e.target.value;
  resetOverviewCategoryService();
  if (!overviewAreaNames.includes(area)) return; // still typing/filtering, not a committed match yet

  overviewCurrentAreaCategories = overviewCategories;
  const categoryInput = document.getElementById('ov-category');
  document.getElementById('ov-category-options').innerHTML = overviewCurrentAreaCategories
    .map((m) => `<option value="${escapeHtml(m.name)}"></option>`)
    .join('');
  categoryInput.disabled = false;

  document.getElementById('overview-service-detail').innerHTML = categoryListHtml(overviewCurrentAreaCategories, area);
});

document.getElementById('ov-category').addEventListener('input', (e) => {
  const categoryName = e.target.value;
  const serviceInput = document.getElementById('ov-service');
  serviceInput.value = '';
  serviceInput.disabled = true;
  document.getElementById('ov-service-options').innerHTML = '';
  overviewCurrentCategoryServices = [];

  const category = overviewCurrentAreaCategories.find((m) => m.name === categoryName);
  if (!category) {
    // Still typing/filtering, or cleared — fall back to the current area's
    // category list rather than the generic empty-state.
    const areaVal = document.getElementById('ov-area').value;
    document.getElementById('overview-service-detail').innerHTML = overviewAreaNames.includes(areaVal)
      ? categoryListHtml(overviewCurrentAreaCategories, areaVal)
      : '<div class="empty-state">Pick an area, category, and service to see its details</div>';
    return;
  }

  const pickedArea = document.getElementById('ov-area').value;
  overviewCurrentCategoryServices = overviewServices.filter((s) => String(s.category_id) === String(category.id) && (!pickedArea || s.area === pickedArea));
  document.getElementById('ov-service-options').innerHTML = overviewCurrentCategoryServices
    .map((s) => `<option value="${escapeHtml(s.name)}"></option>`)
    .join('');
  serviceInput.disabled = false;

  document.getElementById('overview-service-detail').innerHTML = serviceListHtml(overviewCurrentCategoryServices);
});

document.getElementById('ov-service').addEventListener('input', async (e) => {
  const serviceName = e.target.value;
  const detailEl = document.getElementById('overview-service-detail');
  const service0 = overviewCurrentCategoryServices.find((s) => s.name === serviceName);
  if (!service0) {
    // Still typing/filtering, or cleared — fall back to the current category's
    // service list rather than the generic empty-state.
    detailEl.innerHTML = serviceListHtml(overviewCurrentCategoryServices);
    return;
  }
  const serviceId = service0.id;
  detailEl.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const { service } = await api.get('/services/get.php', { id: serviceId });
    const offerCount = overviewOffers.filter((o) => String(o.service_id) === String(serviceId)).length;
    detailEl.innerHTML = `
      <div class="admin-item">
        ${service.logo_url ? `<img class="thumb" src="${escapeHtml(service.logo_url)}" alt="" />` : '<div class="thumb"></div>'}
        <div class="info">
          <div style="font-weight:700;font-size:16px;">${escapeHtml(service.name)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(service.tag_name || 'Uncategorized')} &middot; ${escapeHtml(service.category_name || 'No category')}</div>
          ${statusTag(service.status)}
          ${service.address ? `<div class="sub" style="color:var(--text-muted);margin-top:6px;">${escapeHtml(service.address)}</div>` : ''}
          ${service.phone ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(service.phone)}</div>` : ''}
          ${service.description ? `<p style="margin:10px 0 0;">${escapeHtml(service.description)}</p>` : ''}
        </div>
      </div>
      <div class="stat-cards" style="margin-top:12px;">
        ${statCardHtml('Active offers', offerCount)}
      </div>`;
  } catch (e2) {
    detailEl.innerHTML = `<div class="empty-state">${escapeHtml(e2.message)}</div>`;
  }
});

// --- All Banners: unified view across app/area/category/service banners --------

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
    const { banners, area_banners, category_ads, service_ads } = await api.get('/admin/banners_all.php');
    allBannersCache = [
      ...banners.map((b) => ({ ...b, type: 'App', scope: 'Platform', status: b.window_status })),
      ...area_banners.map((b) => ({ ...b, type: 'Area', scope: b.area, status: b.window_status })),
      ...category_ads.map((b) => ({ ...b, type: 'Category', scope: b.category_name, status: b.status })),
      ...service_ads.map((b) => ({ ...b, type: 'Service', scope: b.service_name, status: b.status })),
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

// --- Analytics: platform summary + per-category/per-service drill-in -----------

function loadAnalyticsPlatform() {
  renderGaPanel(document.getElementById('analytics-platform'), '/analytics/platform_report.php', {});
}

async function loadAnalyticsPickers() {
  try {
    const [{ areas }, { categories }, { services }] = await Promise.all([
      api.get('/areas/list.php'),
      api.get('/categories/list.php'),
      api.get('/admin/services_all.php'),
    ]);
    document.getElementById('an-area-picker').innerHTML =
      '<option value="">Select an area...</option>' +
      areas.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('an-category-picker').innerHTML =
      '<option value="">Select a category...</option>' +
      categories.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    document.getElementById('an-service-picker').innerHTML =
      '<option value="">Select a service...</option>' +
      services.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    // Picker population failing shouldn't block the platform summary above.
  }
}

document.getElementById('an-area-picker').addEventListener('change', (e) => {
  const area = e.target.value;
  document.getElementById('an-category-picker').value = '';
  document.getElementById('an-service-picker').value = '';
  const detail = document.getElementById('analytics-detail');
  if (!area) {
    detail.innerHTML = '';
    return;
  }
  renderGaPanel(detail, '/analytics/area_report.php', { area });
});

document.getElementById('an-category-picker').addEventListener('change', (e) => {
  const categoryId = e.target.value;
  document.getElementById('an-area-picker').value = '';
  document.getElementById('an-service-picker').value = '';
  const detail = document.getElementById('analytics-detail');
  if (!categoryId) {
    detail.innerHTML = '';
    return;
  }
  renderGaPanel(detail, '/analytics/category_report.php', { category_id: categoryId });
});

document.getElementById('an-service-picker').addEventListener('change', (e) => {
  const serviceId = e.target.value;
  document.getElementById('an-area-picker').value = '';
  document.getElementById('an-category-picker').value = '';
  const detail = document.getElementById('analytics-detail');
  if (!serviceId) {
    detail.innerHTML = '';
    return;
  }
  renderGaPanel(detail, '/analytics/service_report.php', { service_id: serviceId });
});

// --- Ratings (Google, cached — see backend/lib/google_places.php) --------

function ratingRowHtml(r) {
  const rating = r.google_rating !== null ? Number(r.google_rating).toFixed(1) : null;
  return `
    <div class="admin-item">
      <div class="info">
        <div style="font-weight:600;">${escapeHtml(r.name)}</div>
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(r.area || '')}</div>
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
  const servicesEl = document.getElementById('ratings-services');
  const categoriesEl = document.getElementById('ratings-categories');
  try {
    const { services, categories } = await api.get('/admin/ratings_report.php');
    servicesEl.innerHTML = services.length ? services.map(ratingRowHtml).join('') : '<div class="empty-state">No services have a Google Place ID yet</div>';
    categoriesEl.innerHTML = categories.length ? categories.map(ratingRowHtml).join('') : '<div class="empty-state">No categories have a Google Place ID yet</div>';
  } catch (e) {
    servicesEl.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
    categoriesEl.innerHTML = '';
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
    const { services, offers, ads, serviceAds, categories, categoryManagers, unitManagers } = await loadPending();
    renderServices(services);
    renderOffers(offers);
    renderAds(ads, serviceAds);
    renderCategories(categories);
    renderSignups(categoryManagers, unitManagers);
  } catch (e) {
    document.getElementById('service-list').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

refresh();
loadRateCards();
loadBanners();
loadAreaBanners();
loadAreas();
loadCategories();
loadMessages();
loadOverview();
loadAllBanners();
loadCategoryBannerCategoryPicker();
loadCategoryBanners();
loadOwnerChatOwners();

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
  const labels = { service_listing: 'Service listing', service_ad_credits: 'Service ad credits', category_subscription: 'Category subscription' };
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
  if (p.target_name) extraBits.push(escapeHtml(p.target_name) + (p.target_area ? ` (${escapeHtml(p.target_area)})` : ''));
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
  document.getElementById('rp-area').innerHTML =
    '<option value="">All areas</option>' + areasCache.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  try {
    const [{ categories }, { services }] = await Promise.all([
      api.get('/categories/list.php'),
      api.get('/admin/services_all.php'),
    ]);
    document.getElementById('rp-category').innerHTML =
      '<option value="">All categories</option>' + categories.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    document.getElementById('rp-service').innerHTML =
      '<option value="">All services</option>' + services.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  } catch (e) {
    // Picker population failing shouldn't block filtering by the other fields.
  }
}

let reportRowsCache = [];

async function runReport() {
  const params = {
    date_from: document.getElementById('rp-date-from').value,
    date_to: document.getElementById('rp-date-to').value,
    area: document.getElementById('rp-area').value,
    category_id: document.getElementById('rp-category').value,
    service_id: document.getElementById('rp-service').value,
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
    'Target', 'Area', 'Provider', 'Order/Transaction ID', 'Amount (INR)', 'Status',
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
    p.target_area || '',
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

// --- Activity Log: audit trail of admin/super_admin actions (super_admin
// only) — recorded server-side via backend/lib/activity_log.php. -----------

const ACTIVITY_ACTION_LABELS = {
  'category.create': 'Added category',
  'category.update': 'Edited category',
  'category.delete': 'Deleted category',
  'category.review': 'Reviewed category profile edit',
  'area.create': 'Added area',
  'area.delete': 'Deleted area',
  'service.review': 'Reviewed service',
  'offer.review': 'Reviewed offer',
  'signup.review': 'Reviewed category manager signup',
  'rate_card.update': 'Updated rate card',
  'admin.create': 'Created admin account',
  'admin.update': 'Edited admin account',
  'admin.delete': 'Deleted admin account',
};

function activityDetailsText(entry) {
  const d = entry.details || {};
  const parts = Object.entries(d)
    .filter(([, v]) => v !== null && v !== '' && !Array.isArray(v))
    .map(([k, v]) => `${k}: ${v}`);
  if (Array.isArray(d.fields) && d.fields.length) parts.push(`fields: ${d.fields.join(', ')}`);
  return parts.join(' · ');
}

async function loadActivityLog() {
  const el = document.getElementById('activity-log-list');
  try {
    const { entries } = await api.get('/admin/activity_log_list.php');
    el.innerHTML = entries.length
      ? entries
          .map(
            (e) => `
      <div class="admin-item">
        <div class="info">
          <div style="font-weight:600;">${escapeHtml(ACTIVITY_ACTION_LABELS[e.action] || e.action)}</div>
          <div class="sub" style="color:var(--text-muted);">${escapeHtml(e.user_name)} &middot; ${escapeHtml(formatDateTime(e.created_at))}</div>
          ${e.target_type ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(e.target_type)}${e.target_id ? ' #' + e.target_id : ''}</div>` : ''}
          ${activityDetailsText(e) ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(activityDetailsText(e))}</div>` : ''}
        </div>
      </div>`
          )
          .join('')
      : '<div class="empty-state">No admin actions recorded yet</div>';
  } catch (e) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

(async function initSuperAdminTabs() {
  try {
    const { user } = await api.get('/auth/me.php');
    if (user.role !== 'super_admin') return;
    document.querySelector('.admin-sidebar-top').textContent = 'Super Admin';
    document.querySelector('.admin-user-name').textContent = user.name;
    document.title = 'Super Admin - Sehy';
    document.getElementById('tab-btn-admins').style.display = '';
    document.getElementById('tab-btn-payments').style.display = '';
    document.getElementById('tab-btn-analytics').style.display = '';
    document.getElementById('tab-btn-reports').style.display = '';
    document.getElementById('tab-btn-incidents').style.display = '';
    document.getElementById('tab-btn-activity-log').style.display = '';
    document.getElementById('nav-group-insights').style.display = '';
    document.getElementById('nav-group-platform').style.display = '';
    loadAdmins();
    loadPayments();
    loadAnalyticsPlatform();
    loadAnalyticsPickers();
    loadRatings();
    loadReportPickers();
    loadIncidents();
    loadActivityLog();
  } catch (e) {
    // Not signed in as a role that can call /auth/me.php successfully — leave the tabs hidden.
  }
})();
