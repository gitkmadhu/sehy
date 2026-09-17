<?php
// Google Analytics 4 (GA4) configuration.
//
// GA_MEASUREMENT_ID is public (it's always visible in any page's source) —
// leaving it empty disables the frontend gtag.js snippet entirely, which is
// the current/default state until this is filled in.
//
// GA_PROPERTY_ID and the service account key are used server-side only, to
// query the GA4 Data API for the mall/store Analytics dashboards. See
// backend/lib/google_analytics.php and the setup steps in the project's
// Google Analytics plan doc — creating the GA4 property, the two
// event-scoped custom dimensions (mall_id, store_id), the Google Cloud
// service account, and granting it Viewer access on the property all have
// to happen once in Google's own consoles; nothing here can do that for you.
// Set both as environment variables in production.
define('GA_MEASUREMENT_ID', getenv('GA_MEASUREMENT_ID') !== false ? getenv('GA_MEASUREMENT_ID') : ''); // e.g. 'G-XXXXXXX'
define('GA_PROPERTY_ID', getenv('GA_PROPERTY_ID') !== false ? getenv('GA_PROPERTY_ID') : ''); // numeric GA4 property ID, e.g. '123456789'
const GA_SERVICE_ACCOUNT_KEY_PATH = __DIR__ . '/ga-service-account.json';
