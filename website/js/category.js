const categoryId = qs('id');
let allCategoryServices = [];

function serviceThumbHtml(service) {
  const img = service.cover_url || service.logo_url;
  return `
    <a class="service-thumb" href="/sehy_web/service.html?id=${service.id}">
      <div class="service-thumb-img">
        ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" />` : '<div class="service-thumb-fallback">&#127978;</div>'}
      </div>
      <div class="service-thumb-name">${escapeHtml(service.name)}</div>
    </a>`;
}

function railHtml(title, services) {
  return `
    <div class="rail">
      <div class="rail-title">${escapeHtml(title)}</div>
      <div class="rail-scroll">${services.map(serviceThumbHtml).join('')}</div>
    </div>`;
}

/** Groups services by tag_name (uncategorized services fall into "Other", sorted last) for the genre-rail layout. */
function groupServicesByCategory(services) {
  const groups = new Map();
  services.forEach((s) => {
    const key = s.tag_name || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => [key, groups.get(key)]);
}

function serviceRailsHtml(services) {
  if (!services.length) return '<div class="empty-state">No services match your search</div>';
  return groupServicesByCategory(services)
    .map(([tag, group]) => railHtml(tag, group))
    .join('');
}

/** Re-filters allCategoryServices by the search box and redraws the tag rails — called on every keystroke. */
function renderServiceRails() {
  const q = document.getElementById('service-search').value.trim().toLowerCase();
  const services = q ? allCategoryServices.filter((s) => s.name.toLowerCase().includes(q)) : allCategoryServices;
  document.getElementById('service-rails').innerHTML = serviceRailsHtml(services);
}

async function init() {
  const content = document.getElementById('content');
  try {
    const [{ category }, { ads }] = await Promise.all([
      api.get('/categories/get.php', { id: categoryId }),
      api.get('/category_ads/list.php', { category_id: categoryId }),
    ]);
    document.title = `${category.name} - Sehy`;
    trackCategoryView(category.id, category.area);
    allCategoryServices = category.services;

    const actions = socialChannelButtons(category);
    if (category.latitude && category.longitude) {
      actions.push(
        `<a class="btn outline" href="https://www.google.com/maps/search/?api=1&query=${category.latitude},${category.longitude}" target="_blank" rel="noopener">Directions</a>`
      );
    }

    const hasEmbeds = !!(
      youtubeVideoId(category.embed_youtube_url) ||
      category.embed_instagram_url ||
      category.embed_facebook_url ||
      category.embed_twitter_url
    );

    const isAdminUser = ['admin', 'super_admin'].includes(currentUser()?.role);
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        ${
          category.area
            ? `<a class="back-link" href="/sehy_web/area.html?name=${encodeURIComponent(category.area)}">&larr; ${escapeHtml(category.area)}</a>`
            : `<a class="back-link" href="javascript:history.back()">&larr; Back</a>`
        }
        ${isAdminUser ? `<a class="back-link" href="/sehy_web/admin.html">Dashboard &rarr;</a>` : ''}
      </div>
      <div class="top-title">${escapeHtml(category.name)}</div>
      <div id="ad-carousel"></div>
      ${
        category.logo_url || category.address || category.description || actions.length
          ? `<div class="card">
        ${category.logo_url ? `<img src="${escapeHtml(category.logo_url)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;margin-bottom:12px;" alt="" />` : ''}
        ${category.address ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(category.address)}</div>` : ''}
        ${category.description ? `<p>${escapeHtml(category.description)}</p>` : ''}
        ${actions.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${actions.join('')}</div>` : ''}
      </div>`
          : ''
      }

      <input class="search-bar" id="service-search" placeholder="Search services in ${escapeHtml(category.name)}..." />
      <div id="service-rails"></div>

      ${hasEmbeds ? `
      <div class="section-title">Watch &amp; Follow</div>
      <div class="social-channels-label">Channels</div>
      <div class="social-icon-row">${socialEmbedIconLinks(category).join('')}</div>
      <div id="featured-embeds"></div>` : ''}
    `;
    renderBannerCarousel(document.getElementById('ad-carousel'), ads, { dummyIfEmpty: false });
    initHeroCarousel(document.getElementById('ad-carousel'), ads.length);
    renderServiceRails();
    document.getElementById('service-search').addEventListener('input', renderServiceRails);
    if (hasEmbeds) {
      renderFeaturedEmbeds(document.getElementById('featured-embeds'), category, { cardStyle: true });
      content.querySelectorAll('.social-icon-row [data-scroll-to]').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById(link.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

init();
