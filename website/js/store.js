const storeId = qs('id');

function productGalleryHtml(products) {
  return products
    .map(
      (p) => `
    <div class="product-card">
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.caption || '')}" loading="lazy" />
      ${p.caption ? `<div class="caption">${escapeHtml(p.caption)}</div>` : ''}
    </div>`
    )
    .join('');
}

/** Footer policy links — external URL wins when set, otherwise an inline expandable block of the free-text version. Renders nothing if the store has none of these set. */
function policiesFooterHtml(store) {
  const items = [];
  if (store.terms_url) {
    items.push(`<a href="${escapeHtml(store.terms_url)}" target="_blank" rel="noopener">Terms &amp; Conditions</a>`);
  } else if (store.terms_text) {
    items.push(`<details><summary>Terms &amp; Conditions</summary><p>${escapeHtml(store.terms_text)}</p></details>`);
  }
  if (store.privacy_url) {
    items.push(`<a href="${escapeHtml(store.privacy_url)}" target="_blank" rel="noopener">Privacy Policy</a>`);
  } else if (store.privacy_text) {
    items.push(`<details><summary>Privacy Policy</summary><p>${escapeHtml(store.privacy_text)}</p></details>`);
  }
  if (store.refund_text) {
    items.push(`<details><summary>Refunds &amp; Returns</summary><p>${escapeHtml(store.refund_text)}</p></details>`);
  }
  if (store.shipping_text) {
    items.push(`<details><summary>Shipping &amp; Pickup</summary><p>${escapeHtml(store.shipping_text)}</p></details>`);
  }
  return items.length ? `<div class="policies-footer">${items.join('')}</div>` : '';
}

// Official WhatsApp app-tile mark: rounded-square green background, white
// chat-bubble ring, white handset.
const WHATSAPP_ICON_SVG =
  '<svg viewBox="0 0 512 512" width="23" height="23" aria-hidden="true">' +
  '<rect width="512" height="512" rx="115" fill="#25D366"/>' +
  '<path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M256 92c-90.5 0-164 73.5-164 164 0 31.8 9.1 61.5 24.8 86.8L92 420l80.2-24.1c24.4 14 52.6 22.1 83.8 22.1 90.5 0 164-73.5 164-164S346.5 92 256 92zm0 300.5c-27.2 0-52.6-7.8-74.1-21.2l-5.3-3.3-48.4 14.5 14.8-46.3-3.6-5.5C124 308.2 115.5 283 115.5 256c0-77.6 62.9-140.5 140.5-140.5s140.5 62.9 140.5 140.5-62.9 140.5-140.5 140.5z"/>' +
  '<path fill="#FFFFFF" d="M222.1 184.2c-3.8-8.4-7.8-8.6-11.4-8.8-3-.1-6.4-.1-9.8-.1s-9 1.3-13.7 6.4c-4.7 5.1-18 17.6-18 42.9s18.4 49.7 21 53.1c2.6 3.4 35.8 57.3 88.3 77.8 43.6 17.1 52.5 13.7 62 12.8 9.5-.9 30.6-12.5 34.9-24.6 4.3-12.1 4.3-22.5 3-24.6-1.3-2.1-4.7-3.4-9.8-6s-30.4-15-35.1-16.7c-4.7-1.7-8.1-2.6-11.5 2.6-3.4 5.1-13.3 16.7-16.3 20.1-3 3.4-6 3.8-11.1 1.3-5.1-2.6-21.6-7.9-41.2-25.3-15.2-13.6-25.5-30.3-28.5-35.4-3-5.1-.3-7.9 2.2-10.4 2.3-2.3 5.1-6 7.7-9 2.6-3 3.4-5.1 5.1-8.5 1.7-3.4.9-6.4-.4-9s-11.5-28.5-16.1-38.3z"/>' +
  '</svg>';

function whatsappSubscribeHtml(subscribed) {
  return `
    <button id="wa-subscribe-btn" class="btn outline social-channel-pill wa-btn" ${subscribed ? 'disabled' : ''}>
      ${WHATSAPP_ICON_SVG}
      <span>${subscribed ? 'Subscribed' : 'Subscribe'}</span>
    </button>`;
}

/** Real multi-color Google "G" mark, used on the Google Reviews button. */
const GOOGLE_G_ICON_SVG =
  '<svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">' +
  '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
  '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
  '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
  '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
  '</svg>';

/**
 * Bottom-sheet with deep links to the store's real Google listing — no
 * rating or review text is fetched or displayed here, since that would
 * require a paid Places API integration this store hasn't set up.
 */
function reviewsModalHtml(store) {
  const placeId = encodeURIComponent(store.google_place_id);
  return `
    <div class="reviews-modal" id="reviews-modal">
      <div class="reviews-sheet">
        <h3>Google Reviews</h3>
        <p>See what shoppers are saying about ${escapeHtml(store.name)} on Google, or leave your own review.</p>
        <a class="sheet-link" href="https://search.google.com/local/reviews?placeid=${placeId}" target="_blank" rel="noopener">See all reviews on Google</a>
        <a class="sheet-link" href="https://search.google.com/local/writereview?placeid=${placeId}" target="_blank" rel="noopener">Write a review</a>
        <button class="sheet-link" id="close-reviews-modal" type="button">Close</button>
      </div>
    </div>`;
}

async function init() {
  const content = document.getElementById('content');
  try {
    const [{ store }, { offers }, { ads }, { products }] = await Promise.all([
      api.get('/stores/get.php', { id: storeId }),
      api.get('/offers/list.php', { store_id: storeId }),
      api.get('/store_ads/list.php', { store_id: storeId }),
      api.get('/store_products/list.php', { store_id: storeId }),
    ]);
    document.title = `${store.name} - GLML`;
    trackStoreView(store.id, store.mall_id, store.city);

    const hasEmbeds = !!(
      youtubeVideoId(store.embed_youtube_url) ||
      store.embed_instagram_url ||
      store.embed_facebook_url ||
      store.embed_twitter_url
    );

    const actions = [];
    if (store.whatsapp)
      actions.push(
        `<a class="btn outline" href="https://wa.me/${escapeHtml(store.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`
      );
    if (store.website)
      actions.push(
        `<a class="btn outline" href="${escapeHtml(store.website)}" target="_blank" rel="noopener">Website</a>`
      );
    if (store.latitude && store.longitude)
      actions.push(
        `<a class="btn outline" href="https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}" target="_blank" rel="noopener">Directions</a>`
      );

    const isAdminUser = ['admin', 'super_admin'].includes(currentUser()?.role);
    content.innerHTML = `
      <div class="store-top-bar">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          ${
            store.mall_id
              ? `<a class="back-link" href="/gmls_web/mall.html?id=${store.mall_id}">&larr; Mall</a>`
              : `<a class="back-link" href="javascript:history.back()">&larr; Back</a>`
          }
          ${isAdminUser ? `<a class="back-link" href="/gmls_web/admin.html">Dashboard &rarr;</a>` : ''}
        </div>
        <h1 class="store-name">${escapeHtml(store.name)}</h1>
        ${store.address ? `<div class="store-address">${escapeHtml(store.address)}</div>` : ''}
      </div>
      <div class="hero-banner" id="ad-carousel"></div>

      ${store.category_name || actions.length ? `
      <div class="store-identity">
        ${store.category_name ? `<div class="store-category">${escapeHtml(store.category_name)}</div>` : ''}
        ${actions.length ? `<div class="store-actions">${actions.join('')}</div>` : ''}
      </div>` : ''}

      ${products.length ? `
      <div class="section-heading">Featured Products</div>
      <div class="product-gallery">${productGalleryHtml(products)}</div>` : ''}

      ${hasEmbeds ? `
      <div class="section-heading">Watch &amp; Follow</div>
      <div class="social-channels-label">Channels</div>
      <div class="social-icon-row">${socialEmbedIconLinks(store).join('')}</div>
      <div id="featured-embeds"></div>` : ''}

      ${store.description ? `
      <div class="about-card">
        <div class="about-label">About ${escapeHtml(store.name)}</div>
        ${escapeHtml(store.description)}
      </div>` : ''}

      ${store.google_place_id ? `
      <div class="cta-row">
        <button id="google-reviews-btn" class="btn outline social-channel-pill gbtn" type="button">${GOOGLE_G_ICON_SVG}<span>Reviews</span></button>
        <div id="wa-subscribe"></div>
      </div>` : `<div class="wa-cta-wrap" id="wa-subscribe"></div>`}

      <div class="section-heading">Current Offers</div>
      <div class="offer-grid" id="offer-grid"></div>

      ${policiesFooterHtml(store)}
    `;

    if (store.google_place_id) {
      content.insertAdjacentHTML('beforeend', reviewsModalHtml(store));
      const modal = document.getElementById('reviews-modal');
      document.getElementById('google-reviews-btn').addEventListener('click', () => modal.classList.add('open'));
      document.getElementById('close-reviews-modal').addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
    }

    const heroBanners = ads.length ? ads : store.cover_url ? [{ image_url: store.cover_url, link_url: null }] : [];
    renderBannerCarousel(document.getElementById('ad-carousel'), heroBanners, { dummyIfEmpty: false });
    initHeroCarousel(document.getElementById('ad-carousel'), heroBanners.length);
    if (hasEmbeds) {
      renderFeaturedEmbeds(document.getElementById('featured-embeds'), store, { cardStyle: true });
      content.querySelectorAll('.social-icon-row [data-scroll-to]').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById(link.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    document.getElementById('wa-subscribe').innerHTML = whatsappSubscribeHtml(false);
    document.getElementById('wa-subscribe-btn').addEventListener('click', async () => {
      if (!requireLogin(window.location.pathname + window.location.search)) return;
      const btn = document.getElementById('wa-subscribe-btn');
      btn.disabled = true;
      try {
        await api.post('/store_whatsapp/subscribe.php', { store_id: store.id });
        document.getElementById('wa-subscribe').innerHTML = whatsappSubscribeHtml(true);
      } catch (e) {
        alert(e.message);
        btn.disabled = false;
      }
    });

    const grid = document.getElementById('offer-grid');
    grid.innerHTML = offers.length
      ? offers.map(offerCardHtml).join('')
      : '<div class="empty-state">No active offers from this store yet</div>';
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

init();
