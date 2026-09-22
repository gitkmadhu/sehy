<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the approved-ads banner on a service's own page, so
// it's readable without signing in (same pattern as category_ads/list.php).
require_fields($_GET, ['service_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url FROM service_ads
     WHERE service_id = ? AND status = 'approved'
     ORDER BY created_at DESC"
);
$stmt->execute([$_GET['service_id']]);

json_ok(['ads' => $stmt->fetchAll()]);
