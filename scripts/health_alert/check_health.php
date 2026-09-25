<?php
// Run on a schedule (cron/launchd) — polls monitoring/health.php and posts to
// Slack only on a status *change*, so a persistent outage doesn't spam the
// channel once per cron tick. See config.example.php for setup.
require __DIR__ . '/config.php';

$statusFilePath = __DIR__ . '/.last_status';
$previousStatus = @file_get_contents($statusFilePath);
$previousStatus = $previousStatus !== false ? trim($previousStatus) : null;

$ch = curl_init(HEALTH_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: ' . MONITORING_KEY],
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$body = ($response !== false) ? json_decode($response, true) : null;
$health = ($httpCode === 200 && ($body['success'] ?? false)) ? $body['data'] : null;
$status = $health['status'] ?? 'unreachable';

if ($status === $previousStatus) {
    exit; // no change since the last run — stay quiet
}
file_put_contents($statusFilePath, $status);

function post_to_slack(string $text): void {
    $ch = curl_init(SLACK_WEBHOOK_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['text' => $text]),
        CURLOPT_TIMEOUT => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

if ($status === 'ok') {
    if ($previousStatus !== null) {
        post_to_slack('✅ Sehy backend recovered — status is now `ok`.');
    }
    exit;
}

$lines = ["🚨 Sehy backend health check: *{$status}*"];
if ($health !== null) {
    $lines[] = "DB: {$health['db']}, errors last hour: {$health['error_counts']['last_hour']}, last 24h: {$health['error_counts']['last_24h']}";
    if (!empty($health['recent_errors'][0]['message'])) {
        $lines[] = 'Most recent error: ' . $health['recent_errors'][0]['message'];
    }
} else {
    $lines[] = "Could not reach or parse health endpoint (HTTP {$httpCode}).";
}
post_to_slack(implode("\n", $lines));
