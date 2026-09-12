<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();

// Public callers must scope to a single city (no fallback to app-wide
// banners — see website/js/city.js). Admin managing the City Banners panel
// may omit `city` to see every city's banners at once.
$user = current_user_optional();
$isAdmin = is_admin($user);

if (!$isAdmin && empty($_GET['city'])) {
    json_error('Missing required field: city', 422);
}

$conditions = [];
$params = [];

if (!empty($_GET['city'])) {
    $conditions[] = 'city = ?';
    $params[] = $_GET['city'];
}

if ($isAdmin) {
    $sql = "SELECT *,
        CASE
            WHEN start_at IS NOT NULL AND start_at > NOW() THEN 'scheduled'
            WHEN end_at IS NOT NULL AND end_at < NOW() THEN 'expired'
            ELSE 'active'
        END AS window_status
        FROM city_banners" . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '') . '
        ORDER BY city ASC, id DESC';
} else {
    $conditions[] = '(start_at IS NULL OR start_at <= NOW())';
    $conditions[] = '(end_at IS NULL OR end_at >= NOW())';
    $sql = 'SELECT * FROM city_banners WHERE ' . implode(' AND ', $conditions) . ' ORDER BY id ASC';
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['city_banners' => $stmt->fetchAll()]);
