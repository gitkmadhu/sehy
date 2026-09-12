<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the approved-ads banner on a store's own page, so
// it's readable without signing in (same pattern as mall_ads/list.php).
require_fields($_GET, ['store_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url FROM store_ads
     WHERE store_id = ? AND status = 'approved'
     ORDER BY created_at DESC"
);
$stmt->execute([$_GET['store_id']]);

json_ok(['ads' => $stmt->fetchAll()]);
