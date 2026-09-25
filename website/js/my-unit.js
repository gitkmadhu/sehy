if (!requireLogin('/sehy_web/my-unit.html')) {
  throw new Error('redirecting to login');
}

const me = currentUser() || {};
const isManager = me.role === 'unit_manager';

const STATUS_LABELS = {
  pending: 'Awaiting review',
  manager_approved: 'Approved by the unit manager · awaiting super admin to publish',
  approved: 'Published on the site',
  rejected: 'Rejected',
};

function socialInput(id, label, value) {
  return `<div class="form-field"><label>${label}</label><input type="url" id="${id}" value="${escapeHtml(value || '')}" placeholder="https://" /></div>`;
}

async function loadUnit() {
  const content = document.getElementById('content');
  try {
    const { unit } = await api.get('/units/mine.php');
    document.title = `${unit.name} - Sehy`;

    // A manager reviews staff edits; their own edits are reviewed by the super admin only.
    const managerCanReview =
      isManager && unit.status === 'pending' && unit.last_edited_by && String(unit.last_edited_by) !== String(me.id);

    content.innerHTML = `
      <a class="back-link" href="/sehy_web/profile.html">&larr; Profile</a>
      <div class="top-title">${escapeHtml(unit.name)}</div>
      <div class="sub" style="color:var(--text-muted);margin-bottom:8px;">${escapeHtml(unit.category_name)}</div>
      <div class="card">
        <span class="chip">${escapeHtml(STATUS_LABELS[unit.status] || unit.status)}</span>
        ${unit.review_note ? `<p style="color:#c0392b;margin-top:8px;">Reason: ${escapeHtml(unit.review_note)}</p>` : ''}
        ${
          managerCanReview
            ? `<div style="display:flex;gap:8px;margin-top:12px;">
                 <button class="btn" id="approve-btn">Approve</button>
                 <button class="btn outline" id="reject-btn">Reject</button>
               </div>`
            : ''
        }
      </div>

      <div class="section-title">${isManager ? 'Unit profile' : 'Update the unit profile'}</div>
      <div class="card">
        <form id="unit-profile-form">
          <div class="form-field"><label>Name</label><input type="text" id="u-name" value="${escapeHtml(unit.name)}" required /></div>
          <div class="form-field"><label>Description</label><textarea id="u-description" rows="3">${escapeHtml(unit.description || '')}</textarea></div>
          <div class="form-field">
            <label>Logo / profile image</label>
            ${unit.logo_url ? `<img src="${escapeHtml(unit.logo_url)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;display:block;margin-bottom:6px;" alt="" />` : ''}
            <input type="file" id="u-logo" accept="image/*" />
          </div>
          <div class="form-field">
            <label>Cover image</label>
            ${unit.cover_url ? `<img src="${escapeHtml(unit.cover_url)}" style="width:100%;max-width:280px;border-radius:8px;display:block;margin-bottom:6px;" alt="" />` : ''}
            <input type="file" id="u-cover" accept="image/*" />
          </div>
          ${socialInput('u-instagram', 'Instagram', unit.instagram_channel_url)}
          ${socialInput('u-youtube', 'YouTube', unit.youtube_channel_url)}
          ${socialInput('u-facebook', 'Facebook', unit.facebook_channel_url)}
          ${socialInput('u-twitter', 'X / Twitter', unit.twitter_channel_url)}
          <div class="error-text" id="u-error" style="display:none;"></div>
          <button class="btn" type="submit" id="u-submit">Submit for approval</button>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
            Saving sends the profile for approval${isManager ? ' by the super admin' : ' — first by your unit manager, then the super admin'}. It is published once approved.
          </div>
        </form>
      </div>

      <div class="section-title">Banners</div>
      <div class="card">
        <form id="unit-ad-form">
          <div class="form-field"><label>Image</label><input type="file" id="ad-image" accept="image/*" required /></div>
          <div class="form-field"><label>Link URL (optional)</label><input type="text" id="ad-link" /></div>
          <div class="error-text" id="ad-error" style="display:none;"></div>
          <button class="btn" type="submit">Add banner</button>
        </form>
      </div>
      <div id="ad-list">
        ${
          unit.ads.length
            ? unit.ads
                .map(
                  (a) => `
          <div class="admin-item">
            <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
            <div class="info"><div class="sub" style="color:var(--text-muted);">${escapeHtml(a.link_url || 'No link')}</div></div>
            <button class="btn danger" data-ad-id="${a.id}">Delete</button>
          </div>`
                )
                .join('')
            : '<div class="empty-state">No banners yet</div>'
        }
      </div>`;

    document.getElementById('unit-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('u-error');
      errEl.style.display = 'none';
      const fd = new FormData();
      fd.set('id', unit.id);
      fd.set('name', document.getElementById('u-name').value.trim());
      fd.set('description', document.getElementById('u-description').value.trim());
      fd.set('instagram_channel_url', document.getElementById('u-instagram').value.trim());
      fd.set('youtube_channel_url', document.getElementById('u-youtube').value.trim());
      fd.set('facebook_channel_url', document.getElementById('u-facebook').value.trim());
      fd.set('twitter_channel_url', document.getElementById('u-twitter').value.trim());
      const logo = document.getElementById('u-logo').files[0];
      if (logo) fd.set('logo', logo);
      const cover = document.getElementById('u-cover').files[0];
      if (cover) fd.set('cover', cover);
      try {
        await api.postForm('/units/update.php', fd);
        loadUnit();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });

    document.getElementById('unit-ad-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('ad-error');
      errEl.style.display = 'none';
      const fd = new FormData();
      fd.set('image', document.getElementById('ad-image').files[0]);
      fd.set('link_url', document.getElementById('ad-link').value.trim());
      try {
        await api.postForm('/unit_ads/create.php', fd);
        loadUnit();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    });

    content.querySelectorAll('[data-ad-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this banner?')) return;
        try { await api.del('/unit_ads/delete.php', { id: Number(btn.dataset.adId) }); loadUnit(); } catch (err) { alert(err.message); }
      });
    });

    if (managerCanReview) {
      document.getElementById('approve-btn').addEventListener('click', async () => {
        try { await api.post('/units/review.php', { id: unit.id, status: 'approved' }); loadUnit(); } catch (err) { alert(err.message); }
      });
      document.getElementById('reject-btn').addEventListener('click', async () => {
        const note = window.prompt('Reason for rejecting:');
        if (!note || !note.trim()) return;
        try { await api.post('/units/review.php', { id: unit.id, status: 'rejected', note: note.trim() }); loadUnit(); } catch (err) { alert(err.message); }
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

loadUnit();
