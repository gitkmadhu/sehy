<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();

// Public callers must scope to a single area (no fallback to app-wide
// banners — see website/js/area.js). Admin managing the Area Banners panel
// may omit `area` to see every area's banners at once.
$user = current_user_optional();
$isAdmin = is_admin($user);

if (!$isAdmin && empty($_GET['area'])) {
    json_error('Missing required field: area', 422);
}

$conditions = [];
$params = [];

if (!empty($_GET['area'])) {
    $conditions[] = 'area = ?';
    $params[] = $_GET['area'];
}

if ($isAdmin) {
    $sql = "SELECT *,
        CASE
            WHEN start_at IS NOT NULL AND start_at > NOW() THEN 'scheduled'
            WHEN end_at IS NOT NULL AND end_at < NOW() THEN 'expired'
            ELSE 'active'
        END AS window_status
        FROM area_banners" . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '') . '
        ORDER BY area ASC, id DESC';
} else {
    $conditions[] = '(start_at IS NULL OR start_at <= NOW())';
    $conditions[] = '(end_at IS NULL OR end_at >= NOW())';
    $sql = 'SELECT * FROM area_banners WHERE ' . implode(' AND ', $conditions) . ' ORDER BY id ASC';
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['area_banners' => $stmt->fetchAll()]);
