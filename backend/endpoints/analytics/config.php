<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../config/analytics.php';

// Public — a GA4 Measurement ID is never a secret, it's visible in any
// page's source. The frontend uses this to decide whether to load gtag.js
// at all.
json_ok(['measurement_id' => GA_MEASUREMENT_ID]);
