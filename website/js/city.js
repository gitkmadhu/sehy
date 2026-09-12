const cityName = qs('name') || '';
let allMalls = [];
let heroSwiper = null;

document.getElementById('city-crumb').textContent = cityName;

function renderHeroCarousel(banners) {
  const wrap = document.getElementById('hero-carousel-wrap');
  if (!banners.length) {
    wrap.innerHTML = '';
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
          <div class="aspect-[16/6] w-full">
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
    </div>`;

  if (heroSwiper) heroSwiper.destroy(true, true);
  heroSwiper = new Swiper('.heroSwiper', {
    loop: banners.length > 1,
    autoplay: banners.length > 1 ? { delay: 4500, disableOnInteraction: false } : false,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  });
}

function mallCardHtml(mall) {
  return `
    <a href="/gmls_web/mall.html?id=${mall.id}"
       class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition flex flex-col overflow-hidden group">
      <div class="h-36 bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center relative p-4">
        ${
          mall.logo_url
            ? `<img src="${escapeHtml(mall.logo_url)}" class="max-h-full max-w-full object-contain" alt="" />`
            : `<span class="text-4xl">&#127970;</span>`
        }
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 class="font-bold text-slate-900 text-lg group-hover:text-indigo-900">${escapeHtml(mall.name)}</h3>
          ${mall.address ? `<p class="text-xs text-slate-500 mt-1">${escapeHtml(mall.address)}</p>` : ''}
        </div>
        <div class="pt-3 border-t border-slate-100 flex items-center justify-end">
          <span class="text-xs font-bold text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">View Mall &rarr;</span>
        </div>
      </div>
    </a>`;
}

function render() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const malls = q ? allMalls.filter((m) => m.name.toLowerCase().includes(q)) : allMalls;

  const resultsEl = document.getElementById('results');
  if (malls.length === 0) {
    resultsEl.innerHTML = `
      <div class="text-center py-16">
        <div class="text-4xl mb-3">&#127980;</div>
        <h3 class="text-xl font-bold text-slate-900">Coming Soon!</h3>
        <p class="text-sm text-slate-500 mt-1">We're still adding malls for ${escapeHtml(cityName)}.</p>
      </div>`;
    return;
  }
  resultsEl.innerHTML = `
    <h3 class="text-lg font-bold text-slate-900 mb-4">Malls in ${escapeHtml(cityName)}</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      ${malls.map(mallCardHtml).join('')}
    </div>`;
}

async function init() {
  try {
    const [{ city_banners }, { malls }] = await Promise.all([
      api.get('/city_banners/list.php', { city: cityName }),
      api.get('/malls/list.php', { city: cityName }),
    ]);
    renderHeroCarousel(city_banners);
    allMalls = malls;
    render();
  } catch (e) {
    document.getElementById('results').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

document.getElementById('search').addEventListener('input', render);
init();
