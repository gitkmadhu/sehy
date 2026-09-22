<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the approved-ads header carousel on a category's own
// page, so it's readable without signing in (same pattern as banners/list.php
// and offers/list.php).
require_fields($_GET, ['category_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url FROM category_ads
     WHERE category_id = ? AND status = 'approved'
     ORDER BY created_at DESC"
);
$stmt->execute([$_GET['category_id']]);

json_ok(['ads' => $stmt->fetchAll()]);
