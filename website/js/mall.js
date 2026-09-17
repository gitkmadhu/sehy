const mallId = qs('id');
let allMallStores = [];

function storeThumbHtml(store) {
  const img = store.cover_url || store.logo_url;
  return `
    <a class="store-thumb" href="/gmls_web/store.html?id=${store.id}">
      <div class="store-thumb-img">
        ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" />` : '<div class="store-thumb-fallback">&#127978;</div>'}
      </div>
      <div class="store-thumb-name">${escapeHtml(store.name)}</div>
    </a>`;
}

function railHtml(title, stores) {
  return `
    <div class="rail">
      <div class="rail-title">${escapeHtml(title)}</div>
      <div class="rail-scroll">${stores.map(storeThumbHtml).join('')}</div>
    </div>`;
}

/** Groups stores by category_name (uncategorized stores fall into "Other", sorted last) for the genre-rail layout. */
function groupStoresByCategory(stores) {
  const groups = new Map();
  stores.forEach((s) => {
    const key = s.category_name || 'Other';
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

function storeRailsHtml(stores) {
  if (!stores.length) return '<div class="empty-state">No stores match your search</div>';
  return groupStoresByCategory(stores)
    .map(([category, group]) => railHtml(category, group))
    .join('');
}

/** Re-filters allMallStores by the search box and redraws the category rails — called on every keystroke. */
function renderStoreRails() {
  const q = document.getElementById('store-search').value.trim().toLowerCase();
  const stores = q ? allMallStores.filter((s) => s.name.toLowerCase().includes(q)) : allMallStores;
  document.getElementById('store-rails').innerHTML = storeRailsHtml(stores);
}

async function init() {
  const content = document.getElementById('content');
  try {
    const [{ mall }, { ads }] = await Promise.all([
      api.get('/malls/get.php', { id: mallId }),
      api.get('/mall_ads/list.php', { mall_id: mallId }),
    ]);
    document.title = `${mall.name} - GLML`;
    trackMallView(mall.id);
    allMallStores = mall.stores;

    const actions = socialChannelButtons(mall);
    if (mall.latitude && mall.longitude) {
      actions.push(
        `<a class="btn outline" href="https://www.google.com/maps/search/?api=1&query=${mall.latitude},${mall.longitude}" target="_blank" rel="noopener">Directions</a>`
      );
    }

    const hasEmbeds = !!(
      youtubeVideoId(mall.embed_youtube_url) ||
      mall.embed_instagram_url ||
      mall.embed_facebook_url ||
      mall.embed_twitter_url
    );

    const isAdminUser = ['admin', 'super_admin'].includes(currentUser()?.role);
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        ${
          mall.city
            ? `<a class="back-link" href="/gmls_web/city.html?name=${encodeURIComponent(mall.city)}">&larr; ${escapeHtml(mall.city)}</a>`
            : `<a class="back-link" href="javascript:history.back()">&larr; Back</a>`
        }
        ${isAdminUser ? `<a class="back-link" href="/gmls_web/admin.html">Dashboard &rarr;</a>` : ''}
      </div>
      <div class="top-title">${escapeHtml(mall.name)}</div>
      <div id="ad-carousel"></div>
      ${
        mall.logo_url || mall.address || mall.description || actions.length
          ? `<div class="card">
        ${mall.logo_url ? `<img src="${escapeHtml(mall.logo_url)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;margin-bottom:12px;" alt="" />` : ''}
        ${mall.address ? `<div class="sub" style="color:var(--text-muted);">${escapeHtml(mall.address)}</div>` : ''}
        ${mall.description ? `<p>${escapeHtml(mall.description)}</p>` : ''}
        ${actions.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">${actions.join('')}</div>` : ''}
      </div>`
          : ''
      }

      <input class="search-bar" id="store-search" placeholder="Search stores in ${escapeHtml(mall.name)}..." />
      <div id="store-rails"></div>

      ${hasEmbeds ? `
      <div class="section-title">Watch &amp; Follow</div>
      <div class="social-channels-label">Channels</div>
      <div class="social-icon-row">${socialEmbedIconLinks(mall).join('')}</div>
      <div id="featured-embeds"></div>` : ''}
    `;
    renderBannerCarousel(document.getElementById('ad-carousel'), ads, { dummyIfEmpty: false });
    initHeroCarousel(document.getElementById('ad-carousel'), ads.length);
    renderStoreRails();
    document.getElementById('store-search').addEventListener('input', renderStoreRails);
    if (hasEmbeds) {
      renderFeaturedEmbeds(document.getElementById('featured-embeds'), mall, { cardStyle: true });
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
