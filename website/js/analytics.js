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

/** Fires a custom GA4 event tagging the category (and its area, if known) being viewed. No-ops if GA isn't configured. */
function trackCategoryView(categoryId, area) {
  initAnalytics().then((ready) => {
    if (!ready || !window.gtag) return;
    const params = { category_id: String(categoryId) };
    if (area) params.area = area;
    window.gtag('event', 'category_view', params);
  });
}

/** Fires a custom GA4 event tagging the service (its category and area, if known) being viewed. No-ops if GA isn't configured. */
function trackServiceView(serviceId, categoryId, area) {
  initAnalytics().then((ready) => {
    if (!ready || !window.gtag) return;
    const params = { service_id: String(serviceId) };
    if (categoryId) params.category_id = String(categoryId);
    if (area) params.area = area;
    window.gtag('event', 'service_view', params);
  });
}

document.addEventListener('DOMContentLoaded', initAnalytics);
