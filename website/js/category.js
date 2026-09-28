const categoryId = qs('id');
const areaFilter = qs('area') || undefined;
let allUnits = [];

function marketCardHtml(u) {
  return neoCardHtml({
    href: `/sehy_web/unit.html?id=${u.id}`,
    title: u.name,
    subtitle: `${u.service_count} ${u.service_count === 1 ? 'shop' : 'shops'}`,
    imageUrl: u.logo_url,
    iconHtml: '&#127978;', // generic marketplace icon, shown until a unit has its own photo
  });
}

/** Re-filters allUnits by the search box and redraws the Markets card row — called on every keystroke. */
function renderMarketList() {
  const q = document.getElementById('service-search').value.trim().toLowerCase();
  const units = q ? allUnits.filter((u) => u.name.toLowerCase().includes(q)) : allUnits;
  document.getElementById('market-list').innerHTML = units.length
    ? cardRowSectionHtml('market-row', units.map(marketCardHtml))
    : `<div class="empty-state">${allUnits.length ? 'No matching markets' : 'No markets listed for this category yet'}</div>`;
  wireCardRowButtons();
}

/** Sample hero slides shown until a real banner has been uploaded for the category. */
function renderDummyHero(container, categoryName) {
  renderDummyHeroCarousel(container, [
    { title: categoryName, sub: 'Your hero banner goes here', bg: 'linear-gradient(120deg,#0155ce,#7c3aed)' },
    { title: 'Advertise your unit or shop', sub: `Reach shoppers browsing ${categoryName}`, bg: 'linear-gradient(120deg,#0ea5e9,#0155ce)' },
    { title: 'Upload a banner, add a link', sub: 'Send visitors to a page on this site or an external website', bg: 'linear-gradient(120deg,#f59e0b,#ef4444)' },
  ]);
}

async function init() {
  const content = document.getElementById('content');
  try {
    const [{ category }, { ads }] = await Promise.all([
      api.get('/categories/get.php', { id: categoryId, area: areaFilter }),
      api.get('/category_ads/list.php', { category_id: categoryId }),
    ]);
    document.title = `${category.name} - Sehy`;
    const crumbArea = areaFilter || category.area;
    setBreadcrumbs([
      ...(crumbArea ? [{ label: crumbArea, href: `/sehy_web/area.html?name=${encodeURIComponent(crumbArea)}` }] : []),
      { label: category.name },
    ]);
    trackCategoryView(category.id, areaFilter || category.area);
    allUnits = category.units || [];

    const isAdminUser = ['admin', 'super_admin'].includes(currentUser()?.role);
    content.innerHTML = `
      ${isAdminUser ? `<div style="text-align:right;"><a class="back-link" href="/sehy_web/admin.html">Dashboard &rarr;</a></div>` : ''}
      <div class="top-title">${escapeHtml(category.name)}</div>
      <div id="ad-carousel"></div>

      <input class="search-bar" id="service-search" placeholder="Search markets in ${escapeHtml(category.name)}..." />
      <div id="market-list"></div>
    `;
    if (ads.length) {
      renderBannerCarousel(document.getElementById('ad-carousel'), ads, { dummyIfEmpty: false });
      initHeroCarousel(document.getElementById('ad-carousel'), ads.length);
    } else {
      renderDummyHero(document.getElementById('ad-carousel'), category.name);
    }
    renderMarketList();
    document.getElementById('service-search').addEventListener('input', renderMarketList);
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

init();
