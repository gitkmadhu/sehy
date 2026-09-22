<?php
// Google Maps JavaScript API key, for the service-location picker on
// my-service.html (see endpoints/maps/config.php, js/my-service.js).
//
// GOOGLE_MAPS_BROWSER_KEY is public (any browser key is visible in page
// source/network requests by design) — it must be an HTTP-referrer-
// restricted key from https://console.cloud.google.com (APIs & Services >
// Credentials), with "Maps JavaScript API" and "Places API" enabled on
// that project and billing turned on (small free monthly credit, then
// paid per load). Do NOT reuse GOOGLE_PLACES_API_KEY here — that one is
// unrestricted for server-to-server calls (see config/google_places.php)
// and would be a real exposure if shipped to browsers as-is.
//
// Leaving this empty disables the location picker entirely — my-service.js
// just hides that section, which is the current/default state until this
// is filled in. Set as an environment variable in production.
define('GOOGLE_MAPS_BROWSER_KEY', getenv('GOOGLE_MAPS_BROWSER_KEY') !== false ? getenv('GOOGLE_MAPS_BROWSER_KEY') : '');
