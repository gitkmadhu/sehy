function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '';
  const n = Number(value);
  return '$' + n.toFixed(2);
}

function daysLeftLabel(expiresAt) {
  const diff = Math.floor((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  return diff <= 0 ? 'Ends today' : `${diff} d left`;
}

function renderBannerCarousel(container, banners, opts) {
  opts = opts || {};
  if (!banners || banners.length === 0) {
    if (opts.dummyIfEmpty) {
      container.innerHTML = `
        <div class="banner-carousel">
          <div class="banner-slide"><div class="placeholder-text">Your banner here</div></div>
        </div>`;
    } else {
      container.innerHTML = '';
    }
    return;
  }
  container.innerHTML = `
    <div class="banner-carousel">
      ${banners
        .map(
          (b) => `
        <a class="banner-slide" href="${b.link_url ? escapeHtml(b.link_url) : '#'}"
           ${b.link_url ? 'target="_blank" rel="noopener"' : 'onclick="return false;"'}>
          <img src="${escapeHtml(b.image_url)}" alt="banner" />
        </a>`
        )
        .join('')}
    </div>`;
}

/**
 * Adds pagination dots + autoplay to a banner carousel rendered by
 * renderBannerCarousel() into $container, when it has more than one slide.
 * $container must be position:relative (or a positioned ancestor) for the
 * dots to overlay correctly — #ad-carousel already is, site-wide.
 */
function initHeroCarousel(container, count) {
  const track = container.querySelector('.banner-carousel');
  if (!track || count <= 1) return;

  const dots = document.createElement('div');
  dots.className = 'hero-dots';
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dots.appendChild(dot);
  }
  container.appendChild(dots);
  const dotEls = [...dots.children];

  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dotEls.forEach((d, i) => d.classList.toggle('active', i === idx));
    }, 80);
  });

  setInterval(() => {
    const current = Math.round(track.scrollLeft / track.clientWidth);
    const next = (current + 1) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  }, 4500);
}

function offerCardHtml(offer) {
  const img = offer.image_url
    ? `<img src="${escapeHtml(offer.image_url)}" alt="${escapeHtml(offer.title)}" />`
    : '';
  const badge = offer.discount_percent
    ? `<div class="badge">-${escapeHtml(offer.discount_percent)}%</div>`
    : '';
  const priceRow =
    offer.discounted_price != null
      ? `<div class="price-row">
           <span class="price">${formatCurrency(offer.discounted_price)}</span>
           ${offer.original_price != null ? `<span class="price-old">${formatCurrency(offer.original_price)}</span>` : ''}
         </div>`
      : '';
  return `
    <a class="offer-card" href="/sehy_web/offer.html?id=${offer.id}">
      <div class="img">${img}${badge}</div>
      <div class="body">
        <div class="service">${escapeHtml(offer.service_name || '')}</div>
        <div class="title">${escapeHtml(offer.title)}</div>
        ${priceRow}
        <div class="sub" style="color:var(--text-muted);font-size:12px;margin-top:4px;">${daysLeftLabel(offer.expires_at)}</div>
      </div>
    </a>`;
}

/**
 * Fetches a GA4 report from $endpoint (analytics/category_report.php or
 * analytics/service_report.php, with $params as query args) and renders it
 * into $container as three summary numbers + a small line chart, or a
 * quiet "not connected yet" note if analytics isn't configured/reachable.
 * Requires Chart.js to already be loaded on the page (window.Chart).
 */
async function renderGaPanel(container, endpoint, params) {
  let data;
  try {
    data = await api.get(endpoint, params);
  } catch (e) {
    container.innerHTML = `<p class="text-sm text-slate-400">Couldn't load analytics: ${escapeHtml(e.message)}</p>`;
    return;
  }
  if (!data.connected) {
    container.innerHTML = `<p style="font-size:13px;color:var(--text-muted,#5b6178);">Analytics isn't connected yet. Once Google Analytics is set up, visit trends will show up here automatically.</p>`;
    return;
  }

  // Inline styles, not framework classes — this renders identically on both
  // the Tailwind-based dashboard pages and the plain-CSS pages.
  const statHtml = (label, value) => `
    <div>
      <p style="font-size:11px;color:var(--text-muted,#5b6178);text-transform:uppercase;letter-spacing:0.04em;margin:0 0 2px;">${label}</p>
      <p style="font-size:20px;font-weight:700;color:var(--text,#1a1d2e);margin:0;">${value}</p>
    </div>`;
  const canvasId = 'ga-chart-' + Math.random().toString(36).slice(2);
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;">
      ${statHtml('Views', data.totals.views)}
      ${statHtml('Visitors', data.totals.users)}
      ${statHtml('Avg. time on page', Math.round(data.totals.avg_engagement_seconds) + 's')}
    </div>
    ${data.daily.length ? `<canvas id="${canvasId}" height="80"></canvas>` : `<p style="font-size:13px;color:var(--text-muted,#5b6178);">No visits recorded yet in this period.</p>`}
  `;

  if (window.Chart && data.daily.length) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.daily.map((d) => `${d.date.slice(4, 6)}/${d.date.slice(6, 8)}`),
        datasets: [{
          label: 'Page views',
          data: data.daily.map((d) => d.views),
          borderColor: '#4338ca',
          backgroundColor: 'rgba(67,56,202,0.08)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }
}

/**
 * Downloads an authed file (e.g. a CSV export) as $filename. A plain <a href>
 * can't carry the bearer token, so this fetches with the auth header, turns
 * the response into a Blob, and triggers the save via a temporary <a>.
 */
async function downloadAuthedFile(url, filename) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function requireLogin(redirectTo) {
  if (!authToken()) {
    window.location.href = '/sehy_web/login.html' + (redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : '');
    return false;
  }
  return true;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Extracts a YouTube video ID from a watch/shorts/youtu.be/embed URL, or null if it doesn't match any known shape. */
function youtubeVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
}

let igEmbedScriptPromise = null;
let twitterEmbedScriptPromise = null;
let fbEmbedScriptPromise = null;

/** Loads a third-party embed script once per page and resolves once it's ready. */
function loadEmbedScript(cacheKeyPromise, src, readyCheck) {
  if (readyCheck()) return Promise.resolve();
  if (cacheKeyPromise) return cacheKeyPromise;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

function loadInstagramEmbedScript() {
  igEmbedScriptPromise = loadEmbedScript(igEmbedScriptPromise, 'https://www.instagram.com/embed.js', () => window.instgrm && window.instgrm.Embeds);
  return igEmbedScriptPromise;
}

function loadTwitterEmbedScript() {
  twitterEmbedScriptPromise = loadEmbedScript(twitterEmbedScriptPromise, 'https://platform.twitter.com/widgets.js', () => window.twttr && window.twttr.widgets);
  return twitterEmbedScriptPromise;
}

function loadFacebookEmbedScript() {
  if (!document.getElementById('fb-root')) {
    const root = document.createElement('div');
    root.id = 'fb-root';
    document.body.insertBefore(root, document.body.firstChild);
  }
  fbEmbedScriptPromise = loadEmbedScript(fbEmbedScriptPromise, 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0', () => window.FB);
  return fbEmbedScriptPromise;
}

/**
 * Renders an entity's featured post/video per platform inline into
 * $container — skips whichever field is unset or doesn't parse. $entity is
 * a service or category row with embed_youtube_url/embed_instagram_url/
 * embed_facebook_url/embed_twitter_url.
 *
 * By default renders a flat stack of "Featured X" sections (category.js's
 * usage). Pass { cardStyle: true } (service.js's boutique-styled page) to
 * instead wrap each platform in a labeled .social-card inside a
 * .social-grid, for CSS in service-page.css to lay out as a card grid/row —
 * the embeds themselves are unchanged either way.
 */
function renderFeaturedEmbeds(container, entity, opts) {
  const cardStyle = !!(opts && opts.cardStyle);
  const videoId = youtubeVideoId(entity.embed_youtube_url);
  const isShorts = !!(entity.embed_youtube_url && entity.embed_youtube_url.includes('/shorts/'));
  const igUrl = entity.embed_instagram_url;
  const fbUrl = entity.embed_facebook_url;
  const isFbReel = !!(fbUrl && fbUrl.includes('/reel'));
  const twitterUrl = entity.embed_twitter_url;

  // Each card gets a stable id (cardStyle mode only) so socialEmbedIconLinks()
  // can jump straight to it. cardStyle mode also gets a refresh button next
  // to the label — a platform embed occasionally fails to render (a stale
  // iframe, a widget script that never ran), so the shopper can retry just
  // that one card without reloading the whole page (see wireEmbedRefresh
  // below, which restores embedOriginalHtml[key] and reruns embedReload[key]).
  const embedOriginalHtml = {};
  const embedReload = {};
  const refreshIconSvg =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6a5.96 5.96 0 0 1 4.22 1.78L13 11h7V4z"/></svg>';
  const block = (key, label, innerHtml) =>
    cardStyle
      ? `<div class="social-card" id="social-card-${key}">
          <div class="social-card-label-row">
            <span class="social-card-label">${escapeHtml(label)}</span>
            <button type="button" class="embed-refresh-btn" data-refresh="${key}" aria-label="Refresh ${escapeHtml(label)}" title="Refresh">${refreshIconSvg}</button>
          </div>
          ${innerHtml}
        </div>`
      : `<div class="section-title">Featured ${escapeHtml(label)}</div>${innerHtml}`;

  // Each platform embed loads a bit slow (external script + iframe), so
  // every card shows a spinner overlay (marked with data-embed="<key>")
  // until the real content swaps in — see armEmbedSpinner() below.
  const spinnerHtml = '<div class="embed-loading"><div class="embed-spinner"></div></div>';

  let ytCard = '';
  if (videoId) {
    // Shorts are vertical (9:16), same as an Instagram reel's own natural
    // shape — a regular video stays landscape (16:9).
    const aspectPadding = isShorts ? '177.78%' : '56.25%';
    const ytInner = `<div class="video-frame" data-embed="youtube" style="position:relative;width:100%;padding-top:${aspectPadding};border-radius:12px;overflow:hidden;margin-bottom:${cardStyle ? '0' : '16px'};background:var(--surface-alt,#eee);">
        ${spinnerHtml}
        <iframe src="https://www.youtube.com/embed/${escapeHtml(videoId)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" onload="this.parentElement.querySelector('.embed-loading').classList.add('hide')"></iframe>
      </div>`;
    ytCard = block('youtube', cardStyle ? (isShorts ? 'YouTube Shorts' : 'YouTube') : 'Video', ytInner);
    embedOriginalHtml.youtube = ytInner;
    embedReload.youtube = () => {}; // a fresh iframe element re-fires its own onload on insert
  }
  let igCard = '';
  if (igUrl) {
    const igInner = `<div class="embed-wrap" data-embed="instagram" style="position:relative;min-height:260px;">
        ${spinnerHtml}
        <blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(igUrl)}" data-instgrm-version="14" style="margin:0${cardStyle ? '' : ' 0 16px'};width:100%;"></blockquote>
      </div>`;
    igCard = block('instagram', cardStyle ? 'Instagram' : 'Instagram Post', igInner);
    embedOriginalHtml.instagram = igInner;
    embedReload.instagram = () => {
      loadInstagramEmbedScript().then(() => {
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
      });
    };
  }
  let fbCard = '';
  if (fbUrl) {
    // A Reel is vertical (9:16), same treatment as an Instagram reel or a
    // YouTube Short — the plugin's own auto-sized iframe is pinned to fill
    // that frame instead of whatever box it would otherwise compute.
    const fbInner = isFbReel
      ? `<div class="video-frame" data-embed="facebook" style="position:relative;width:100%;padding-top:177.78%;border-radius:12px;overflow:hidden;margin-bottom:${cardStyle ? '0' : '16px'};background:var(--surface-alt,#eee);">
            ${spinnerHtml}
            <div class="fb-video" data-href="${escapeHtml(fbUrl)}" data-width="500" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
          </div>`
      : `<div class="embed-wrap" data-embed="facebook" style="position:relative;min-height:260px;${cardStyle ? '' : 'margin-bottom:16px;'}">
            ${spinnerHtml}
            <div class="fb-video" data-href="${escapeHtml(fbUrl)}" data-width="500"></div>
          </div>`;
    fbCard = block('facebook', cardStyle ? (isFbReel ? 'Facebook Reel' : 'Facebook') : 'Facebook Post', fbInner);
    embedOriginalHtml.facebook = fbInner;
    embedReload.facebook = (wrap) => {
      loadFacebookEmbedScript().then(() => {
        if (window.FB) window.FB.XFBML.parse(wrap);
      });
    };
  }
  // Same 9:16-shaped frame as a Facebook Reel, but unlike a Reel a tweet's
  // own header/text sits above its video, so the frame is a floor (via
  // padding-top) rather than a hard clip — overflow stays visible so a
  // tweet with more text than a bare video can still grow past it instead
  // of cutting the video off.
  let twitterCard = '';
  if (twitterUrl) {
    const twInner = `<div class="video-frame" data-embed="twitter" style="position:relative;width:100%;padding-top:177.78%;border-radius:12px;margin-bottom:${cardStyle ? '0' : '16px'};background:var(--surface-alt,#eee);">
        ${spinnerHtml}
        <div class="tw-embed-fill" style="position:absolute;top:0;left:0;width:100%;">
          <blockquote class="twitter-tweet" style="margin:0;"><a href="${escapeHtml(twitterUrl)}"></a></blockquote>
        </div>
      </div>`;
    twitterCard = block('twitter', cardStyle ? 'X / Twitter' : 'Tweet', twInner);
    embedOriginalHtml.twitter = twInner;
    embedReload.twitter = (wrap) => {
      loadTwitterEmbedScript().then(() => {
        if (window.twttr && window.twttr.widgets) window.twttr.widgets.load(wrap);
      });
    };
  }

  if (cardStyle) {
    // Row 1: Instagram + YouTube (when it's a Short) — reel-shaped content.
    // Row 2: everything else — YouTube (when a regular video), Facebook,
    // and Twitter always sit together here regardless of whether the
    // individual Facebook/Twitter post happens to be a vertical clip; only
    // YouTube's own row placement depends on its URL shape.
    const shortFormRow = [igCard, isShorts ? ytCard : ''].filter(Boolean).join('');
    const longFormRow = [!isShorts ? ytCard : '', fbCard, twitterCard].filter(Boolean).join('');
    container.innerHTML = `<div class="social-rows">
      ${shortFormRow ? `<div class="social-grid">${shortFormRow}</div>` : ''}
      ${longFormRow ? `<div class="social-grid">${longFormRow}</div>` : ''}
    </div>`;
  } else {
    container.innerHTML = ytCard + igCard + fbCard + twitterCard;
  }
  if (igUrl) {
    armEmbedSpinner(container, 'instagram');
    loadInstagramEmbedScript().then(() => {
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    });
  }
  if (fbUrl) {
    armEmbedSpinner(container, 'facebook');
    loadFacebookEmbedScript().then(() => {
      if (window.FB) window.FB.XFBML.parse(container);
    });
  }
  if (twitterUrl) {
    armEmbedSpinner(container, 'twitter');
    loadTwitterEmbedScript().then(() => {
      if (window.twttr && window.twttr.widgets) window.twttr.widgets.load(container);
    });
  }

  container.querySelectorAll('.embed-refresh-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.refresh;
      const wrap = container.querySelector(`[data-embed="${key}"]`);
      if (!wrap || !embedOriginalHtml[key]) return;
      wrap.outerHTML = embedOriginalHtml[key];
      armEmbedSpinner(container, key);
      embedReload[key](container.querySelector(`[data-embed="${key}"]`));
    });
  });
}

/**
 * Hides a platform's spinner overlay (see spinnerHtml in
 * renderFeaturedEmbeds) once its embed script swaps the placeholder
 * blockquote/div for a real iframe — with a timeout fallback in case the
 * platform script fails or never confirms, so the spinner doesn't spin
 * forever.
 */
function armEmbedSpinner(container, key) {
  const wrap = container.querySelector(`[data-embed="${key}"]`);
  const loadingEl = wrap && wrap.querySelector('.embed-loading');
  if (!loadingEl) return;
  const hide = () => loadingEl.classList.add('hide');
  const observer = new MutationObserver(() => {
    if (wrap.querySelector('iframe')) {
      hide();
      observer.disconnect();
    }
  });
  observer.observe(wrap, { childList: true, subtree: true });
  setTimeout(() => {
    hide();
    observer.disconnect();
  }, 12000);
}

const SOCIAL_CHANNEL_ICONS = {
  instagram_channel_url: {
    label: 'Instagram',
    // Composed from simple shapes (rounded square + lens ring + flash dot)
    // rather than one path — more reliably recognizable at 18px than a
    // hand-reproduced brand path.
    icon: '<rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="#E1306C"/>',
  },
  youtube_channel_url: {
    label: 'YouTube',
    icon: '<path fill="#FF0000" d="M23.498 6.186a2.994 2.994 0 0 0-2.107-2.118C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.391.523A2.994 2.994 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.994 2.994 0 0 0 2.107 2.118c1.886.523 9.391.523 9.391.523s7.505 0 9.391-.523a2.994 2.994 0 0 0 2.107-2.118C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.75 15.568V8.432L15.818 12l-6.068 3.568z"/>',
  },
  facebook_channel_url: {
    label: 'Facebook',
    icon: '<path fill="#1877F2" d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>',
  },
  twitter_channel_url: {
    label: 'X / Twitter',
    icon: '<path fill="#000000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  },
};

/** Circular icon-button links to an entity's social channels — shows the platform's logo, not its name. */
function socialChannelButtons(entity) {
  return Object.keys(SOCIAL_CHANNEL_ICONS)
    .filter((field) => entity[field])
    .map((field) => {
      const { label, icon } = SOCIAL_CHANNEL_ICONS[field];
      return `<a class="btn outline social-icon-btn" href="${escapeHtml(entity[field])}" target="_blank" rel="noopener" aria-label="${label}" title="${label}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${icon}</svg>
      </a>`;
    });
}

/**
 * Labeled pill links (icon + platform name) that jump to a platform's card
 * within the same "Watch & Follow" section (see the id="social-card-<key>"
 * set by renderFeaturedEmbeds' cardStyle mode) rather than opening an
 * external profile — the label makes clear these are channel shortcuts, not
 * just decorative logos. Only rendered for a platform that actually has a
 * featured embed — there's nothing to jump to otherwise.
 */
function socialEmbedIconLinks(entity) {
  const cards = {
    instagram: { present: !!entity.embed_instagram_url, channelField: 'instagram_channel_url' },
    youtube: { present: !!youtubeVideoId(entity.embed_youtube_url), channelField: 'youtube_channel_url' },
    facebook: { present: !!entity.embed_facebook_url, channelField: 'facebook_channel_url' },
    twitter: { present: !!entity.embed_twitter_url, channelField: 'twitter_channel_url' },
  };
  return Object.keys(cards)
    .filter((key) => cards[key].present)
    .map((key) => {
      const { label, icon } = SOCIAL_CHANNEL_ICONS[cards[key].channelField];
      return `<a href="#social-card-${key}" class="btn outline social-channel-pill" data-scroll-to="social-card-${key}" aria-label="${label}" title="${label}">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${icon}</svg>
        <span>${escapeHtml(label)}</span>
      </a>`;
    });
}
