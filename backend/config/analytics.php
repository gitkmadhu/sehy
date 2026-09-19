<?php
// Google Analytics 4 (GA4) configuration.
//
// GA_MEASUREMENT_ID is public (it's always visible in any page's source) —
// leaving it empty disables the frontend gtag.js snippet entirely, which is
// the current/default state until this is filled in.
//
// GA_PROPERTY_ID and the reporting credentials below are used server-side
// only, to query the GA4 Data API for the mall/store Analytics dashboards.
// See backend/lib/google_analytics.php — creating the GA4 property, the two
// event-scoped custom dimensions (mall_id, store_id), and granting API read
// access all have to happen once in Google's own consoles; nothing here can
// do that for you.
define('GA_MEASUREMENT_ID', getenv('GA_MEASUREMENT_ID') !== false ? getenv('GA_MEASUREMENT_ID') : ''); // e.g. 'G-XXXXXXX'
define('GA_PROPERTY_ID', getenv('GA_PROPERTY_ID') !== false ? getenv('GA_PROPERTY_ID') : ''); // numeric GA4 property ID, e.g. '123456789'

// Reporting API access, option 1 (preferred): OAuth refresh token. Used
// because this GCP project's org enforces iam.disableServiceAccountKeyCreation,
// which blocks option 2 below entirely. Obtained via a one-time manual
// consent flow (see ga_get_access_token_via_oauth_refresh() in
// lib/google_analytics.php) as whichever Google account has Viewer access
// on the GA4 property — the refresh token doesn't expire until revoked.
define('GA_OAUTH_CLIENT_ID', getenv('GA_OAUTH_CLIENT_ID') !== false ? getenv('GA_OAUTH_CLIENT_ID') : '');
define('GA_OAUTH_CLIENT_SECRET', getenv('GA_OAUTH_CLIENT_SECRET') !== false ? getenv('GA_OAUTH_CLIENT_SECRET') : '');
define('GA_OAUTH_REFRESH_TOKEN', getenv('GA_OAUTH_REFRESH_TOKEN') !== false ? getenv('GA_OAUTH_REFRESH_TOKEN') : '');

// Reporting API access, option 2 (fallback, currently unusable — see above):
// a service account key, either as GA_SERVICE_ACCOUNT_KEY_JSON (env var,
// the whole key file's content — the only option in production, since a
// gitignored file never reaches a deploy built straight from git) or this
// local file (convenient for local dev, if the org policy allows it there).
const GA_SERVICE_ACCOUNT_KEY_PATH = __DIR__ . '/ga-service-account.json';
