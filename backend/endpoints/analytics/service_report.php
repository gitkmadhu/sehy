<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/google_analytics.php';

$user = current_user();
require_fields($_GET, ['service_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
$stmt->execute([$_GET['service_id']]);
$service = $stmt->fetch();

if (!$service) {
    json_error('Service not found', 404);
}
if (!can_manage_service($user, $service)) {
    json_error('Forbidden', 403);
}

$report = ga_run_report('service_id', (string) $service['id'], ['screenPageViews', 'activeUsers', 'averageSessionDuration']);

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
