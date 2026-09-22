if (!requireLogin('/sehy_web/my-category-ads.html')) {
  throw new Error('redirecting to login');
}

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

function adTimestampHtml(a) {
  if (!a.created_at) return '';
  const created = new Date(a.created_at).toLocaleString();
  const edited = a.edited_at
    ? ` &middot; edited ${new Date(a.edited_at).toLocaleString()}`
    : '';
  return `<div class="sub" style="color:var(--text-muted);font-size:12px;">Uploaded ${created}${edited}</div>`;
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

async function render() {
  const content = document.getElementById('content');
  const [{ ads }, { user }] = await Promise.all([
    api.get('/category_ads/mine.php'),
    api.get('/auth/me.php'),
  ]);
  const category = user.category_id ? (await api.get('/categories/get.php', { id: user.category_id })).category : null;

  const liveAds = ads.filter((a) => a.status === 'approved');
  const pendingAds = ads.filter((a) => a.status === 'pending');
  const managerApprovedAds = ads.filter((a) => a.status === 'manager_approved');

  content.innerHTML = `
    <div class="top-title">${escapeHtml(user.category_name || 'Category Ads')}</div>
    <div class="section-title">Analytics</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Live Ads</div>
        <div style="font-size:20px;font-weight:700;">${liveAds.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">/ ${ads.length} total</span></div>
      </div>
      <div class="card" style="padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Pending Review</div>
        <div style="font-size:20px;font-weight:700;">${pendingAds.length} <span style="font-size:12px;font-weight:400;color:var(--text-muted);">${managerApprovedAds.length ? `· ${managerApprovedAds.length} awaiting admin` : ''}</span></div>
      </div>
    </div>
    ${category ? `
    <div class="section-title">Category Profile</div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="sub" style="font-weight:700;color:${statusColor(category.status)};">${statusLabel(category.status)}</div>
        <button class="btn outline" id="toggle-category-form" style="width:auto;padding:6px 14px;">Edit</button>
      </div>
      ${category.status === 'rejected' && category.review_note ? `<div class="sub" style="color:var(--text-muted);margin-bottom:8px;">Reason: ${escapeHtml(category.review_note)}</div>` : ''}
      <div id="category-form-wrap" style="display:none;">
        <form id="category-form">
          <div class="form-field"><label>Category name</label><input type="text" id="ml-name" value="${escapeHtml(category.name || '')}" required /></div>
          <div class="form-field"><label>Description</label><textarea id="ml-description" rows="2">${escapeHtml(category.description || '')}</textarea></div>
          <div class="form-field"><label>Address</label><input type="text" id="ml-address" value="${escapeHtml(category.address || '')}" /></div>
          <div class="form-field">
            <label>Logo</label><input type="file" id="ml-logo" accept="image/*" />
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 500x500px and compressed automatically.</div>
          </div>
          <div class="form-field"><label>Instagram channel link (optional)</label><input type="text" id="ml-instagram-channel" value="${escapeHtml(category.instagram_channel_url || '')}" /></div>
          <div class="form-field"><label>YouTube channel link (optional)</label><input type="text" id="ml-youtube-channel" value="${escapeHtml(category.youtube_channel_url || '')}" /></div>
          <div class="form-field"><label>Facebook channel link (optional)</label><input type="text" id="ml-facebook-channel" value="${escapeHtml(category.facebook_channel_url || '')}" /></div>
          <div class="form-field"><label>Twitter/X channel link (optional)</label><input type="text" id="ml-twitter-channel" value="${escapeHtml(category.twitter_channel_url || '')}" /></div>
          <div class="section-title" style="font-size:14px;margin-top:16px;">Featured on the category page</div>
          <div class="form-field"><label>Instagram post/reel URL to feature (optional)</label><input type="text" id="ml-embed-instagram" value="${escapeHtml(category.embed_instagram_url || '')}" /></div>
          <div class="form-field"><label>YouTube video/Shorts URL to feature (optional)</label><input type="text" id="ml-embed-youtube" value="${escapeHtml(category.embed_youtube_url || '')}" /></div>
          <div class="form-field"><label>Facebook post/video URL to feature (optional)</label><input type="text" id="ml-embed-facebook" value="${escapeHtml(category.embed_facebook_url || '')}" /></div>
          <div class="form-field"><label>Tweet/X post URL to feature (optional)</label><input type="text" id="ml-embed-twitter" value="${escapeHtml(category.embed_twitter_url || '')}" /></div>
          <div class="error-text" id="ml-error" style="display:none;"></div>
          <button class="btn" type="submit" id="ml-submit">Save &amp; Send for Approval</button>
        </form>
      </div>
    </div>` : ''}
    <div class="section-title">Category Ads</div>
    <div id="ad-items"></div>
    <div class="section-title">Upload an ad</div>
    <div class="card">
      <form id="ad-form">
        <div class="form-field">
          <label>Image</label><input type="file" id="a-image" accept="image/*" required />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">JPEG, PNG, or WEBP, up to 40MB — resized to 1600px on the longest edge and compressed automatically.</div>
        </div>
        <div class="form-field"><label>Link URL (optional)</label><input type="url" id="a-link" placeholder="https://..." /></div>
        <div class="error-text" id="a-error" style="display:none;"></div>
        <button class="btn" type="submit" id="a-submit">Submit for review</button>
      </form>
    </div>
  `;

  const itemsEl = document.getElementById('ad-items');
  itemsEl.innerHTML = ads.length
    ? ads
        .map(
          (a) => `
      <div class="admin-item">
        <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
        <div class="info">
          <div class="name" style="color:${statusColor(a.status)};font-weight:700;">${statusLabel(a.status)}</div>
          ${a.link_url ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(a.link_url)}</div>` : ''}
          ${adTimestampHtml(a)}
        </div>
        <button class="btn outline" data-edit-id="${a.id}" data-link="${escapeHtml(a.link_url || '')}">Edit</button>
      </div>`
        )
        .join('')
    : '<div class="empty-state">No ads submitted yet. Add one below.</div>';

  itemsEl.querySelectorAll('button[data-edit-id]').forEach((btn) => {
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
      fd.set('id', btn.dataset.editId);
      fd.set('link_url', link);
      if (file) fd.set('image', file);
      await api.postForm('/category_ads/update.php', fd);
      render();
    });
  });

  document.getElementById('ad-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('a-submit');
    const err = document.getElementById('a-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const image = document.getElementById('a-image').files[0];
      if (!image) throw new Error('An image is required');
      const fd = new FormData();
      fd.set('image', image);
      const link = document.getElementById('a-link').value.trim();
      if (link) fd.set('link_url', link);
      await api.postForm('/category_ads/create.php', fd);
      render();
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  });

  if (category) {
    document.getElementById('toggle-category-form').addEventListener('click', () => {
      const wrap = document.getElementById('category-form-wrap');
      wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('ml-submit');
      const err = document.getElementById('ml-error');
      err.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const fd = new FormData();
        fd.set('id', category.id);
        fd.set('name', document.getElementById('ml-name').value.trim());
        fd.set('description', document.getElementById('ml-description').value.trim());
        fd.set('address', document.getElementById('ml-address').value.trim());
        const logo = document.getElementById('ml-logo').files[0];
        if (logo) fd.set('logo', logo);
        fd.set('instagram_channel_url', document.getElementById('ml-instagram-channel').value.trim());
        fd.set('youtube_channel_url', document.getElementById('ml-youtube-channel').value.trim());
        fd.set('facebook_channel_url', document.getElementById('ml-facebook-channel').value.trim());
        fd.set('twitter_channel_url', document.getElementById('ml-twitter-channel').value.trim());
        fd.set('embed_instagram_url', document.getElementById('ml-embed-instagram').value.trim());
        fd.set('embed_youtube_url', document.getElementById('ml-embed-youtube').value.trim());
        fd.set('embed_facebook_url', document.getElementById('ml-embed-facebook').value.trim());
        fd.set('embed_twitter_url', document.getElementById('ml-embed-twitter').value.trim());
        await api.postForm('/categories/update.php', fd);
        render();
      } catch (ex) {
        err.textContent = ex.message;
        err.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save & Send for Approval';
      }
    });
  }
}

render().catch((e) => {
  document.getElementById('content').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
});
