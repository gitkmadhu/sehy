<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../config/google_maps.php';

// Public — a browser-restricted Maps key is never a secret, it's visible
// in any page that loads it. The frontend uses this to decide whether to
// show the location picker at all.
json_ok(['key' => GOOGLE_MAPS_BROWSER_KEY]);
