<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../config/monitoring.php';

// Called by an external monitoring tool (e.g. Hermes Agent), not a signed-in
// Sehy user — authenticated via a shared secret, same pattern as
// revenuecat_webhook.php's Authorization-header check.
if (!hash_equals(MONITORING_API_KEY, raw_authorization_header())) {
    json_error('Invalid monitoring authorization', 401);
}

$dbUp = true;
try {
    sehy_db()->query('SELECT 1');
} catch (Throwable $e) {
    $dbUp = false;
}

$entries = [];
if (is_readable(ERROR_LOG_PATH)) {
    $lines = array_filter(explode("\n", file_get_contents(ERROR_LOG_PATH)));
    foreach ($lines as $line) {
        $decoded = json_decode($line, true);
        if ($decoded !== null) {
            $entries[] = $decoded;
        }
    }
}

$now = time();
$lastHour = 0;
$last24h = 0;
foreach ($entries as $entry) {
    $age = $now - strtotime($entry['timestamp']);
    if ($age <= 3600) {
        $lastHour++;
    }
    if ($age <= 86400) {
        $last24h++;
    }
}

// Simple, single field an alerting rule can key off; the detail below is
// for investigating once something's already flagged as not "ok".
$status = 'ok';
if (!$dbUp) {
    $status = 'down';
} elseif ($lastHour >= 5) {
    $status = 'degraded';
}

json_ok([
    'status' => $status,
    'db' => $dbUp ? 'up' : 'down',
    'error_counts' => ['last_hour' => $lastHour, 'last_24h' => $last24h],
    'recent_errors' => array_slice(array_reverse($entries), 0, 20),
]);
