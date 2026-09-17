let allCities = [];
let heroSwiper = null;

if (['admin', 'super_admin'].includes(currentUser()?.role)) {
  document.getElementById('dashboard-link').hidden = false;
}

const CITY_PALETTE = [
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

function cityColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CITY_PALETTE[hash % CITY_PALETTE.length];
}

function renderHeroCarousel(banners) {
  const wrap = document.getElementById('hero-carousel-wrap');

  if (!banners.length) {
    wrap.innerHTML = `
      <div class="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-10 md:p-14 min-h-[200px] flex items-center justify-center text-center">
        <div class="space-y-2">
          <span class="bg-amber-400 text-slate-900 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">Welcome</span>
          <h2 class="text-2xl md:text-3xl font-extrabold">Discover Malls & Stores Near You</h2>
          <p class="text-sm md:text-base text-gray-200 mt-2">Browse a city below to get started.</p>
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

function renderCityGrid(cities) {
  const wrap = document.getElementById('city-grid-wrap');
  if (cities.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No matching cities</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="max-h-[420px] overflow-y-auto pr-2 city-scroll">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        ${cities
          .map((c) => {
            const color = cityColor(c.name);
            return `
        <a href="/gmls_web/city.html?name=${encodeURIComponent(c.name)}"
           class="bg-white p-5 rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-md transition text-center flex flex-col items-center group">
          <div class="w-14 h-14 rounded-full ${color.bg} flex items-center justify-center text-xl font-bold ${color.text} mb-3 transition">
            ${escapeHtml(c.name.charAt(0).toUpperCase())}
          </div>
          <h4 class="font-bold text-gray-800 group-hover:text-amber-600 text-sm transition">${escapeHtml(c.name)}</h4>
        </a>`;
          })
          .join('')}
      </div>
    </div>`;
}

async function init() {
  try {
    const [{ banners }, { cities }] = await Promise.all([
      api.get('/banners/list.php'),
      api.get('/cities/list.php'),
    ]);
    renderHeroCarousel(banners);
    allCities = cities;
    renderCityGrid(allCities);
  } catch (e) {
    document.getElementById('city-grid-wrap').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('city-search').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = q ? allCities.filter((c) => c.name.toLowerCase().includes(q)) : allCities;
  renderCityGrid(filtered);
});

init();
