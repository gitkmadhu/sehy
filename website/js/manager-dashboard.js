if (!requireLogin('/sehy_web/manager-dashboard.html')) {
  throw new Error('redirecting to login');
}

function statusBadge(status) {
  const styles = {
    approved: 'text-emerald-800 bg-emerald-100',
    pending: 'text-amber-800 bg-amber-100',
    rejected: 'text-rose-800 bg-rose-100',
    manager_approved: 'text-blue-800 bg-blue-100',
  };
  const labels = { manager_approved: 'Awaiting Admin Publish' };
  const label = labels[status] || (status.charAt(0).toUpperCase() + status.slice(1));
  return `<span class="px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending} rounded-full">${label}</span>`;
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function subscriptionStatusHtml(expiresAt) {
  if (!expiresAt) {
    return '<span class="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">No active subscription</span>';
  }
  const isFuture = new Date(expiresAt.replace(' ', 'T')).getTime() > Date.now();
  const style = isFuture ? 'text-emerald-800 bg-emerald-100' : 'text-rose-800 bg-rose-100';
  const label = (isFuture ? 'Active until ' : 'Expired on ') + fmtDate(expiresAt);
  return `<span class="text-xs font-semibold ${style} px-2.5 py-1 rounded-full">${escapeHtml(label)}</span>`;
}

// A category manager may approve a pending edit to their own category — but only
// when their own category_staff made that edit, never when they submitted it
// themselves.
function categoryCanReview(category, user) {
  return category.status === 'pending'
    && category.last_edited_by !== null
    && String(category.last_edited_by) !== String(user.id);
}

function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

function serviceTableHtml(services) {
  if (!services.length) {
    return '<p class="text-sm text-slate-500">No services in your category yet.</p>';
  }
  return `
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-slate-400 font-medium">
          <th class="pb-3">Service</th>
          <th class="pb-3">Tag / Area</th>
          <th class="pb-3">Status</th>
          <th class="pb-3 text-right">Moderation Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${services
          .map((s) => {
            const meta = [s.tag_name, s.area].filter(Boolean).map(escapeHtml).join(' · ');
            const actions =
              s.status === 'pending'
                ? `<button class="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700" data-service-review-id="${s.id}" data-action="approved">Approve</button>
                   <button class="px-2.5 py-1 bg-rose-600 text-white rounded text-xs hover:bg-rose-700" data-service-review-id="${s.id}" data-action="rejected">Reject</button>`
                : `<a class="text-indigo-600 font-medium hover:underline" href="/sehy_web/my-service.html?service_id=${s.id}&name=${encodeURIComponent(s.name)}">Manage Offers</a>`;
            return `
        <tr>
          <td class="py-3 font-semibold text-slate-800">${escapeHtml(s.name)}</td>
          <td class="py-3 text-slate-600">${meta}</td>
          <td class="py-3">${statusBadge(s.status)}</td>
          <td class="py-3 text-right space-x-2">${actions}</td>
        </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}

function adTableHtml(ads) {
  if (!ads.length) {
    return '<p class="text-sm text-slate-500">No ads submitted for your category yet.</p>';
  }
  return `
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-slate-400 font-medium">
          <th class="pb-3">Banner Asset</th>
          <th class="pb-3">Uploaded By (Staff)</th>
          <th class="pb-3">Original Upload Time</th>
          <th class="pb-3">Last Modified / Replaced</th>
          <th class="pb-3">Status</th>
          <th class="pb-3 text-right">Review</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${ads
          .map((a) => {
            const reviewButtons =
              a.status === 'pending'
                ? `<button class="text-xs bg-emerald-600 text-white px-2 py-1 rounded" data-ad-review-id="${a.id}" data-action="approved">Approve</button>
                   <button class="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded" data-ad-review-id="${a.id}" data-action="rejected">Reject</button>`
                : '';
            return `
        <tr>
          <td class="py-3"><img src="${escapeHtml(a.image_url)}" class="w-16 h-8 object-cover rounded" alt="" /></td>
          <td class="py-3 font-medium text-slate-700">${escapeHtml(a.uploaded_by_name || '—')}</td>
          <td class="py-3 text-slate-500">${fmtDate(a.created_at)}</td>
          <td class="py-3 text-slate-500">${a.edited_at ? fmtDate(a.edited_at) : '—'}</td>
          <td class="py-3">${statusBadge(a.status)}</td>
          <td class="py-3 text-right space-x-2 whitespace-nowrap">
            ${reviewButtons}
            <button class="text-xs text-indigo-600 hover:underline" data-ad-edit-id="${a.id}" data-link="${escapeHtml(a.link_url || '')}">Edit</button>
            <button class="text-xs text-rose-600 hover:underline" data-ad-delete-id="${a.id}">Take Down</button>
          </td>
        </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}

async function load() {
  const content = document.getElementById('content');
  const { user } = await api.get('/auth/me.php');

  if (user.role !== 'category_manager') {
    content.innerHTML = '<div class="text-rose-600">This dashboard is for category managers only.</div>';
    return;
  }

  document.getElementById('category-heading').textContent = (user.category_name || 'Category Management').toUpperCase();

  const [{ services }, { ads }, { offers }, { category }, { rate_cards }] = await Promise.all([
    api.get('/services/mine.php'),
    api.get('/category_ads/mine.php'),
    api.get('/offers/mine.php'),
    api.get('/categories/get.php', { id: user.category_id }),
    api.get('/rate_cards/list.php', { tier: 'category_subscription' }),
  ]);

  const pending = services.filter((s) => s.status === 'pending');
  const managerApprovedServices = services.filter((s) => s.status === 'manager_approved');
  const approved = services.filter((s) => s.status === 'approved');
  const rejected = services.filter((s) => s.status === 'rejected');
  const otherServices = services.filter((s) => !['pending', 'manager_approved', 'approved', 'rejected'].includes(s.status));
  const liveAds = ads.filter((a) => a.status === 'approved');
  const pendingAds = ads.filter((a) => a.status === 'pending');
  const managerApprovedAds = ads.filter((a) => a.status === 'manager_approved');
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const liveOffers = offers.filter((o) => o.status === 'approved');

  content.innerHTML = `
    <section id="analytics-section">
      <h2 class="text-base font-bold text-slate-800 mb-4">Analytics</h2>
      <div class="grid grid-cols-3 gap-6">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Services</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">${approved.length} <span class="text-sm font-normal text-slate-400">/ ${services.length} total</span></p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <p class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Service Approvals</p>
          <p class="text-2xl font-bold text-amber-800 mt-1">${pending.length} <span class="text-sm font-normal text-amber-600">${managerApprovedServices.length ? `· ${managerApprovedServices.length} awaiting admin` : ''}${rejected.length ? ` · ${rejected.length} rejected` : ''}</span></p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Hero Banners</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">${liveAds.length} <span class="text-sm font-normal text-slate-400">/ ${ads.length} total${pendingAds.length ? ` · ${pendingAds.length} pending` : ''}${managerApprovedAds.length ? ` · ${managerApprovedAds.length} awaiting admin` : ''}</span></p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Offers</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">${liveOffers.length} <span class="text-sm font-normal text-slate-400">/ ${offers.length} total${pendingOffers.length ? ` · ${pendingOffers.length} pending` : ''}</span></p>
        </div>
      </div>
      <div class="mt-6">
        <h3 class="text-sm font-bold text-slate-700 mb-3">Website Traffic (last 30 days) — via Google Analytics</h3>
        <div id="ga-category-panel" class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    </section>

    <section id="category-profile-section" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-base font-bold text-slate-800">Category Profile</h2>
        <div class="flex items-center gap-3">
          ${statusBadge(category.status)}
          <button id="toggle-category-form" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">Edit &amp; Send for Approval</button>
        </div>
      </div>
      ${category.status === 'rejected' && category.review_note ? `<p class="text-sm text-rose-700 bg-rose-50 border-l-4 border-rose-400 p-3 rounded mb-4">Reason: ${escapeHtml(category.review_note)}</p>` : ''}
      ${categoryCanReview(category, user) ? `
      <p class="text-sm text-blue-700 bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">Edited by your staff — awaiting your review.</p>
      <div class="flex gap-2 mb-4">
        <button id="category-approve-btn" class="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700">Approve</button>
        <button id="category-reject-btn" class="text-xs bg-rose-600 text-white px-3 py-1.5 rounded hover:bg-rose-700">Reject</button>
      </div>` : ''}
      <div id="category-form-wrap" class="hidden p-4 bg-slate-50 rounded-lg border border-slate-200">
        <form id="category-form" class="grid grid-cols-2 gap-3">
          <input id="ml-name" placeholder="Category name" value="${escapeHtml(category.name || '')}" required class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <textarea id="ml-description" placeholder="Description" rows="2" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm">${escapeHtml(category.description || '')}</textarea>
          <input id="ml-address" placeholder="Address" value="${escapeHtml(category.address || '')}" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="ml-area" placeholder="Area" value="${escapeHtml(category.area || '')}" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <div class="col-span-2 text-xs text-slate-500">Logo <input id="ml-logo" type="file" accept="image/*" />
            <div class="text-slate-400 mt-1">JPEG, PNG, or WEBP, up to 40MB — resized to 500x500px and compressed automatically.</div>
          </div>
          <input id="ml-instagram-channel" placeholder="Instagram channel link (optional)" value="${escapeHtml(category.instagram_channel_url || '')}" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="ml-youtube-channel" placeholder="YouTube channel link (optional)" value="${escapeHtml(category.youtube_channel_url || '')}" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="ml-facebook-channel" placeholder="Facebook channel link (optional)" value="${escapeHtml(category.facebook_channel_url || '')}" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="ml-twitter-channel" placeholder="Twitter/X channel link (optional)" value="${escapeHtml(category.twitter_channel_url || '')}" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="ml-place-id" placeholder="Google Place ID (optional)" value="${escapeHtml(category.google_place_id || '')}" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <div class="col-span-2 text-xs text-slate-400">Featured video/post embeds are managed by your category staff and appear here for review once submitted.</div>
          <div id="ml-error" class="col-span-2 text-rose-600 text-xs hidden"></div>
          <button type="submit" id="ml-submit" class="col-span-2 bg-slate-900 text-white rounded px-3 py-2 text-sm hover:bg-slate-800">Save &amp; Send for Approval</button>
        </form>
      </div>
    </section>

    <section id="services-section" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-base font-bold text-slate-800">Service Directory &amp; Registrations</h2>
        <button id="toggle-service-form" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">+ Add Service</button>
      </div>
      <div id="service-form-wrap" class="hidden mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <form id="service-form" class="grid grid-cols-2 gap-3">
          <input id="s-name" placeholder="Service name" required class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="s-address" placeholder="Address" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="s-phone" placeholder="Phone" class="border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="s-logo" type="file" accept="image/*" class="col-span-2 text-sm" />
          <div class="col-span-2 text-xs text-slate-400">JPEG, PNG, or WEBP, up to 40MB — resized to 500x500px and compressed automatically.</div>
          <div id="s-error" class="col-span-2 text-rose-600 text-xs hidden"></div>
          <button type="submit" id="s-submit" class="col-span-2 bg-emerald-600 text-white rounded px-3 py-2 text-sm hover:bg-emerald-700">Submit for review</button>
        </form>
      </div>
      ${serviceTableHtml([...pending, ...managerApprovedServices, ...approved, ...rejected, ...otherServices])}
    </section>

    <section id="ads-section" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-base font-bold text-slate-800">Hero Banner Creatives &amp; Audit Trail</h2>
        <div class="flex items-center gap-3">
          ${subscriptionStatusHtml(category.subscription_expires_at)}
          <button id="toggle-ad-form" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800">+ Upload Ad</button>
        </div>
      </div>
      <div class="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p class="text-xs text-slate-500 m-0 mb-3">Ad uploads — by you or your staff — require an active subscription. Buy or renew below.</p>
        <div class="flex items-center gap-2 flex-wrap">
          ${rate_cards
            .map(
              (r) => `
            <button class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800" data-buy-plan="${escapeHtml(r.plan_key)}" data-plan-label="${escapeHtml(r.label)}">
              ${escapeHtml(r.label)} — &#8377;${(r.amount / 100).toLocaleString('en-IN')}
            </button>`
            )
            .join('')}
        </div>
      </div>
      <div id="ad-credit-error" class="text-rose-600 text-xs hidden mb-4"></div>
      <div id="ad-form-wrap" class="hidden mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <form id="ad-form" class="grid grid-cols-2 gap-3">
          <input id="a-image" type="file" accept="image/*" required class="col-span-2 text-sm" />
          <div class="col-span-2 text-xs text-slate-400">JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge and compressed automatically.</div>
          <input id="a-link" type="url" placeholder="Link URL (optional)" class="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm" />
          <div id="a-error" class="col-span-2 text-rose-600 text-xs hidden"></div>
          <button type="submit" id="a-submit" class="col-span-2 bg-emerald-600 text-white rounded px-3 py-2 text-sm hover:bg-emerald-700">Upload</button>
        </form>
      </div>
      ${adTableHtml(ads)}
    </section>
  `;

  renderGaPanel(document.getElementById('ga-category-panel'), '/analytics/category_report.php', {});

  document.getElementById('toggle-service-form').addEventListener('click', () => {
    document.getElementById('service-form-wrap').classList.toggle('hidden');
  });
  document.getElementById('toggle-ad-form').addEventListener('click', () => {
    document.getElementById('ad-form-wrap').classList.toggle('hidden');
  });

  content.querySelectorAll('button[data-buy-plan]').forEach((btn) => {
    const originalLabel = btn.textContent;
    btn.addEventListener('click', async () => {
      const err = document.getElementById('ad-credit-error');
      err.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Opening payment...';
      try {
        await payWithRazorpay({
          purpose: 'category_subscription',
          plan: btn.dataset.buyPlan,
          description: `${btn.dataset.planLabel} subscription for ${category.name}`,
        });
        load();
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
  document.getElementById('toggle-category-form').addEventListener('click', () => {
    document.getElementById('category-form-wrap').classList.toggle('hidden');
  });

  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ml-submit');
    const err = document.getElementById('ml-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const fd = new FormData();
      fd.set('id', category.id);
      fd.set('name', document.getElementById('ml-name').value.trim());
      fd.set('description', document.getElementById('ml-description').value.trim());
      fd.set('address', document.getElementById('ml-address').value.trim());
      fd.set('area', document.getElementById('ml-area').value.trim());
      const logo = document.getElementById('ml-logo').files[0];
      if (logo) fd.set('logo', logo);
      fd.set('instagram_channel_url', document.getElementById('ml-instagram-channel').value.trim());
      fd.set('youtube_channel_url', document.getElementById('ml-youtube-channel').value.trim());
      fd.set('facebook_channel_url', document.getElementById('ml-facebook-channel').value.trim());
      fd.set('twitter_channel_url', document.getElementById('ml-twitter-channel').value.trim());
      fd.set('google_place_id', document.getElementById('ml-place-id').value.trim());
      await api.postForm('/categories/update.php', fd);
      load();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Send for Approval';
    }
  });

  const categoryApproveBtn = document.getElementById('category-approve-btn');
  if (categoryApproveBtn) {
    categoryApproveBtn.addEventListener('click', async () => {
      await api.post('/admin/review_category.php', { id: category.id, status: 'approved' });
      load();
    });
  }
  const categoryRejectBtn = document.getElementById('category-reject-btn');
  if (categoryRejectBtn) {
    categoryRejectBtn.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejecting this edit:');
      if (!note || !note.trim()) return;
      await api.post('/admin/review_category.php', { id: category.id, status: 'rejected', note: note.trim() });
      load();
    });
  }

  content.querySelectorAll('button[data-service-review-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.serviceReviewId), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this service:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/admin/review_service.php', payload);
      load();
    });
  });

  content.querySelectorAll('button[data-ad-review-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const payload = { id: Number(btn.dataset.adReviewId), status: btn.dataset.action };
      if (btn.dataset.action === 'rejected') {
        const note = window.prompt('Reason for rejecting this ad:');
        if (!note || !note.trim()) return;
        payload.note = note.trim();
      }
      await api.post('/category_ads/review.php', payload);
      load();
    });
  });

  content.querySelectorAll('button[data-ad-edit-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const replaceImage = window.confirm('Replace the image? Cancel to just update the link.');
      let file = null;
      if (replaceImage) {
        file = await pickFile();
        if (!file) return;
      }
      const link = window.prompt('Link URL (optional):', btn.dataset.link || '');
      if (link === null) return;
      const fd = new FormData();
      fd.set('id', btn.dataset.adEditId);
      fd.set('link_url', link);
      if (file) fd.set('image', file);
      await api.postForm('/category_ads/update.php', fd);
      load();
    });
  });

  content.querySelectorAll('button[data-ad-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Take down this ad?')) return;
      await api.del('/category_ads/delete.php', { id: Number(btn.dataset.adDeleteId) });
      load();
    });
  });

  document.getElementById('service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('s-submit');
    const err = document.getElementById('s-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const fd = new FormData();
      fd.set('name', document.getElementById('s-name').value.trim());
      fd.set('address', document.getElementById('s-address').value.trim());
      fd.set('phone', document.getElementById('s-phone').value.trim());
      const logo = document.getElementById('s-logo').files[0];
      if (logo) fd.set('logo', logo);
      await api.postForm('/services/create.php', fd);
      load();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
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
      await api.postForm('/category_ads/create.php', fd);
      load();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  });
}

document.getElementById('signout-btn').addEventListener('click', () => {
  logout();
  window.location.href = '/sehy_web/index.html';
});

load().catch((e) => {
  document.getElementById('content').innerHTML = `<div class="text-rose-600">${escapeHtml(e.message)}</div>`;
});
