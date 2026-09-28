let allSections = [];
let heroSwiper = null;

if (['admin', 'super_admin'].includes(currentUser()?.role)) {
  document.getElementById('dashboard-link').hidden = false;
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
        <a class="swiper-slide" ${bannerLinkAttrs(b.link_url)}>
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

// One section per category, listing its units (and any services not yet placed in a unit).
// Tab bar with one tab per visible section; a click scrolls to that section
// and the tab for the section currently in view is shown pressed in.
function renderHomeTabs(sections) {
  const bar = document.getElementById('home-tabs');
  if (!bar) return;
  const wrap = document.getElementById('home-tabs-wrap');
  if (wrap) wrap.hidden = sections.length === 0;
  bar.hidden = sections.length === 0;
  // First pill: a home icon that scrolls back to the top (the full page, hero banner included).
  const homeTab = `<button type="button" role="tab" class="neo-tab neo-tab-home active" data-target="home" aria-label="Home" title="Back to top">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V10"/></svg>
    </button>`;
  bar.innerHTML =
    homeTab +
    sections
      .map((sec) => `<button type="button" role="tab" class="neo-tab" data-target="section-${sec.id}">${escapeHtml(sec.name)}</button>`)
      .join('');
  bar.querySelectorAll('.neo-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeLockUntil = Date.now() + 900;
      setActiveSection(tab.dataset.target);
      if (tab.dataset.target === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(tab.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Marks one section (and its tab) as the active one.
function setActiveSection(sectionId) {
  const bar = document.getElementById('home-tabs');
  if (!bar) return;
  bar.querySelectorAll('.neo-tab').forEach((t) => t.classList.toggle('active', t.dataset.target === sectionId));
  document.querySelectorAll('.home-section').forEach((sec) => sec.classList.toggle('active', sec.id === sectionId));
  const active = bar.querySelector('.neo-tab.active');
  // Keep the active tab visible inside the (horizontally scrollable) bar without moving the page.
  if (active) bar.scrollTo({ left: active.offsetLeft - bar.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
}

// A tab click sets the active section itself; scroll tracking pauses until the smooth scroll has settled.
let activeLockUntil = 0;

function updateActiveTab() {
  const bar = document.getElementById('home-tabs');
  const wrap = document.getElementById('home-tabs-wrap');
  // Shadow under the bar only while it is actually stuck to the top.
  if (wrap && !wrap.hidden) wrap.classList.toggle('stuck', wrap.getBoundingClientRect().top <= 0);
  if (!bar || bar.hidden || Date.now() < activeLockUntil) return;
  const tabs = [...bar.querySelectorAll('.neo-tab')];
  let current = tabs[0]; // the home pill, until the first section has reached the top part of the screen
  for (const tab of tabs.slice(1)) {
    const sec = document.getElementById(tab.dataset.target);
    if (sec && sec.getBoundingClientRect().top <= window.innerHeight * 0.35) current = tab;
  }
  if (current && !current.classList.contains('active')) setActiveSection(current.dataset.target);
}
window.addEventListener('scroll', updateActiveTab, { passive: true });

function renderHomeSections(sections) {
  const wrap = document.getElementById('home-sections-wrap');
  if (!wrap) return;
  wrap.innerHTML = sections
    .map((sec) => {
      const cards = [
        ...sec.units.map((u) =>
          neoCardHtml({
            href: `/sehy_web/unit.html?id=${u.id}`,
            title: u.name,
            subtitle: `${u.service_count} ${Number(u.service_count) === 1 ? 'shop' : 'shops'}`,
            imageUrl: u.logo_url,
            iconHtml: '&#127978;', // generic marketplace icon, shown until a unit has its own photo
          })
        ),
        ...sec.services.map((s) =>
          neoCardHtml({
            href: `/sehy_web/service.html?id=${s.id}`,
            title: s.name,
            subtitle: s.tagline || s.tag_name || s.area,
            imageUrl: s.logo_url,
          })
        ),
      ];
      return `
    <section id="section-${sec.id}" class="home-section max-w-5xl mx-auto px-4 pb-10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-900">${escapeHtml(sec.name)}</h3>
        <a href="/sehy_web/category.html?id=${sec.id}" class="view-all-link text-sm font-semibold hover:underline whitespace-nowrap">View all &rarr;</a>
      </div>
      ${
        cards.length
          ? cardRowSectionHtml(`row-${sec.id}`, cards)
          : '<div class="empty-state">Nothing listed in this category yet</div>'
      }
    </section>`;
    })
    .join('');
  wireCardRowButtons();
  renderHomeTabs(sections);
  setActiveSection('home');
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
