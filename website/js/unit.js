const unitId = qs('id');

async function init() {
  const content = document.getElementById('content');
  try {
    const [{ unit }, { ads }] = await Promise.all([
      api.get('/units/get.php', { id: unitId }),
      api.get('/unit_ads/list.php', { unit_id: unitId }),
    ]);
    const actions = socialChannelButtons(unit);
    document.title = `${unit.name} - Sehy`;
    content.innerHTML = `
      <a class="back-link" href="/sehy_web/category.html?id=${unit.category_id}">&larr; ${escapeHtml(unit.category_name)}</a>
      <div class="top-title">${escapeHtml(unit.name)}</div>
      <div id="ad-carousel"></div>
      ${
        unit.logo_url || unit.description || actions.length
          ? `<div class="card">
        ${unit.logo_url ? `<img src="${escapeHtml(unit.logo_url)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;margin-bottom:12px;" alt="" />` : ''}
        ${unit.description ? `<p>${escapeHtml(unit.description)}</p>` : ''}
        ${actions.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${actions.join('')}</div>` : ''}
      </div>`
          : ''
      }
      <div class="section-title">${unit.services.length} ${unit.services.length === 1 ? 'shop' : 'shops'}</div>
      ${
        unit.services.length
          ? unit.services
              .map(
                (s) => `
        <a class="admin-item" href="/sehy_web/service.html?id=${s.id}" style="text-decoration:none;color:inherit;">
          ${s.logo_url ? `<img class="thumb" src="${escapeHtml(s.logo_url)}" alt="" />` : '<div class="thumb"></div>'}
          <div class="info">
            <div style="font-weight:600;">${escapeHtml(s.name)}</div>
            <div class="sub" style="color:var(--text-muted);">${escapeHtml(s.tagline || s.tag_name || s.address || s.area || '')}</div>
          </div>
        </a>`
              )
              .join('')
          : '<div class="empty-state">No shops listed here yet</div>'
      }`;
    renderBannerCarousel(document.getElementById('ad-carousel'), ads, { dummyIfEmpty: false });
    initHeroCarousel(document.getElementById('ad-carousel'), ads.length);
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

init();
