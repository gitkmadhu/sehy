<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/google_analytics.php';

// Platform-wide counterpart to mall_report.php/store_report.php — same
// response shape, but no mall_id/store_id dimension filter, for the admin
// Analytics dashboard's overall summary.
$user = current_user();
require_role($user, ['admin']);

$report = ga_run_platform_report(['screenPageViews', 'activeUsers', 'averageSessionDuration']);

if ($report === null || empty($report['rows'])) {
    json_ok([
        'connected' => false,
        'daily' => [],
        'totals' => ['views' => 0, 'users' => 0, 'avg_engagement_seconds' => 0],
    ]);
}

$daily = [];
$totalViews = 0;
$totalUsers = 0;
$durationSum = 0.0;
$durationCount = 0;

foreach ($report['rows'] as $row) {
    $date = $row['dimensionValues'][0]['value'] ?? '';
    $views = (int) ($row['metricValues'][0]['value'] ?? 0);
    $users = (int) ($row['metricValues'][1]['value'] ?? 0);
    $duration = (float) ($row['metricValues'][2]['value'] ?? 0);

    $daily[] = ['date' => $date, 'views' => $views];
    $totalViews += $views;
    $totalUsers += $users;
    if ($duration > 0) {
        $durationSum += $duration;
        $durationCount++;
    }
}

json_ok([
    'connected' => true,
    'daily' => $daily,
    'totals' => [
        'views' => $totalViews,
        'users' => $totalUsers,
        'avg_engagement_seconds' => $durationCount > 0 ? round($durationSum / $durationCount, 1) : 0,
    ],
]);
