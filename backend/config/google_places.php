<?php
// Google Places API key — get one from https://console.cloud.google.com
// (APIs & Services > Credentials), with the "Places API" enabled on that
// project and billing turned on (small free monthly credit, then paid per
// request). Leaving this empty disables rating fetches entirely — the
// admin Analytics tab just shows "not rated yet" for every store/mall,
// which is the current/default state until this is filled in. Set
// GOOGLE_PLACES_API_KEY as an environment variable in production.
define('GOOGLE_PLACES_API_KEY', getenv('GOOGLE_PLACES_API_KEY') !== false ? getenv('GOOGLE_PLACES_API_KEY') : '');
