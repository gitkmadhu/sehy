let gtagReadyPromise = null;

/**
 * Loads gtag.js site-wide, but only if a Measurement ID is actually
 * configured (backend/config/analytics.php) — until the one-time Google
 * Analytics/Cloud setup is done, this is a silent no-op, not an error.
 */
function initAnalytics() {
  if (gtagReadyPromise) return gtagReadyPromise;
  gtagReadyPromise = api
    .get('/analytics/config.php')
    .then(({ measurement_id }) => {
      if (!measurement_id) return false;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', measurement_id);

      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurement_id)}`;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    })
    .catch(() => false);
  return gtagReadyPromise;
}

/** Fires a custom GA4 event tagging the mall being viewed. No-ops if GA isn't configured. */
function trackMallView(mallId) {
  initAnalytics().then((ready) => {
    if (ready && window.gtag) window.gtag('event', 'mall_view', { mall_id: String(mallId) });
  });
}

/** Fires a custom GA4 event tagging the store (and its mall, if any) being viewed. No-ops if GA isn't configured. */
function trackStoreView(storeId, mallId) {
  initAnalytics().then((ready) => {
    if (!ready || !window.gtag) return;
    const params = { store_id: String(storeId) };
    if (mallId) params.mall_id = String(mallId);
    window.gtag('event', 'store_view', params);
  });
}

document.addEventListener('DOMContentLoaded', initAnalytics);
