let allSections = [];
let heroSwiper = null;

if (['admin', 'super_admin'].includes(currentUser()?.role)) {
  document.getElementById('dashboard-link').hidden = false;
}

const AREA_PALETTE = [
  { bg: 'bg-amber-50 group-hover:bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-sky-50 group-hover:bg-sky-100', text: 'text-sky-600' },
  { bg: 'bg-emerald-50 group-hover:bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-rose-50 group-hover:bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-purple-50 group-hover:bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-cyan-50 group-hover:bg-cyan-100', text: 'text-cyan-600' },
  { bg: 'bg-pink-50 group-hover:bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-orange-50 group-hover:bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-lime-50 group-hover:bg-lime-100', text: 'text-lime-700' },
  { bg: 'bg-blue-50 group-hover:bg-blue-100', text: 'text-blue-600' },
];

function areaColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AREA_PALETTE[hash % AREA_PALETTE.length];
}

function renderHeroCarousel(banners) {
  const wrap = document.getElementById('hero-carousel-wrap');

  if (!banners.length) {
    wrap.innerHTML = `
      <div class="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-10 md:p-14 min-h-[200px] flex items-center justify-center text-center">
        <div class="space-y-2">
          <span class="bg-amber-400 text-slate-900 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">Welcome</span>
          <h2 class="text-2xl md:text-3xl font-extrabold">Discover Categories & Services Near You</h2>
          <p class="text-sm md:text-base text-gray-200 mt-2">Browse a category below to get started.</p>
        </div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="swiper heroSwiper rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      <div class="swiper-wrapper">
        ${banners
          .map(
            (b) => `
        <a class="swiper-slide" href="${b.link_url ? escapeHtml(b.link_url) : '#'}"
           ${b.link_url ? 'target="_blank" rel="noopener"' : 'onclick="return false;"'}>
          <div class="aspect-[16/7] w-full">
            <img src="${escapeHtml(b.image_url)}" class="w-full h-full object-cover" alt="" />
          </div>
        </a>`
          )
          .join('')}
      </div>
      <div class="swiper-pagination"></div>
      ${banners.length > 1 ? `
      <div class="swiper-button-next hidden sm:flex"></div>
      <div class="swiper-button-prev hidden sm:flex"></div>` : ''}
    </div>
  `;

  if (heroSwiper) heroSwiper.destroy(true, true);
  heroSwiper = new Swiper('.heroSwiper', {
    loop: banners.length > 1,
    autoplay: banners.length > 1 ? { delay: 4500, disableOnInteraction: false } : false,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  });
}

function homeCardHtml(href, title, subtitle, logoUrl) {
  const color = areaColor(title);
  return `
    <a href="${href}"
       class="bg-white p-4 rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-md transition flex flex-col items-center text-center group">
      ${
        logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="" class="w-16 h-16 rounded-full object-cover mb-3" />`
          : `<div class="w-16 h-16 rounded-full ${color.bg} flex items-center justify-center text-xl font-bold ${color.text} mb-3">${escapeHtml(title.charAt(0).toUpperCase())}</div>`
      }
      <h4 class="font-bold text-gray-800 group-hover:text-amber-600 text-sm transition">${escapeHtml(title)}</h4>
      <p class="text-xs text-gray-500 mt-1">${escapeHtml(subtitle || '')}</p>
    </a>`;
}

// One section per category, listing its units (and any services not yet placed in a unit).
function renderHomeSections(sections) {
  const wrap = document.getElementById('home-sections-wrap');
  if (!wrap) return;
  wrap.innerHTML = sections
    .map((sec) => {
      const cards = [
        ...sec.units.map((u) =>
          homeCardHtml(`/sehy_web/unit.html?id=${u.id}`, u.name, `${u.service_count} ${Number(u.service_count) === 1 ? 'shop' : 'shops'}`, u.logo_url)
        ),
        ...sec.services.map((s) =>
          homeCardHtml(`/sehy_web/service.html?id=${s.id}`, s.name, s.tagline || s.tag_name || s.area, s.logo_url)
        ),
      ];
      return `
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900">${escapeHtml(sec.name)}</h3>
        <a href="/sehy_web/category.html?id=${sec.id}" class="text-sm font-semibold text-indigo-700 hover:underline whitespace-nowrap">View all &rarr;</a>
      </div>
      ${
        cards.length
          ? `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">${cards.join('')}</div>`
          : '<div class="empty-state">Nothing listed in this category yet</div>'
      }
    </section>`;
    })
    .join('');
}

async function init() {
  try {
    const [{ banners }, { sections }] = await Promise.all([
      api.get('/banners/list.php'),
      api.get('/home/list.php'),
    ]);
    renderHeroCarousel(banners);
    allSections = sections;
    renderHomeSections(allSections);
  } catch (e) {
    document.getElementById('home-sections-wrap').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('home-search').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    renderHomeSections(allSections);
    return;
  }
  const match = (item) => item.name.toLowerCase().includes(q);
  // Keep only the units/shops that match, and hide sections left empty.
  const filtered = allSections
    .map((sec) => ({ ...sec, units: sec.units.filter(match), services: sec.services.filter(match) }))
    .filter((sec) => sec.units.length || sec.services.length);
  renderHomeSections(filtered);
  if (!filtered.length) {
    document.getElementById('home-sections-wrap').innerHTML = '<div class="empty-state">No matching units or shops</div>';
  }
});

init();
