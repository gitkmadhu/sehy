<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/google_analytics.php';

$user = current_user();
require_role($user, ['admin', 'mall_manager', 'mall_staff']);

if (is_admin($user)) {
    require_fields($_GET, ['mall_id']);
    $mallId = (int) $_GET['mall_id'];
} else {
    if ($user['mall_id'] === null) {
        json_error('Your account is not linked to a mall yet. Contact the admin.', 422);
    }
    $mallId = (int) $user['mall_id'];
}

$report = ga_run_report('mall_id', (string) $mallId, ['screenPageViews', 'activeUsers', 'averageSessionDuration']);

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
