<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the approved-ads header carousel on a mall's own
// page, so it's readable without signing in (same pattern as banners/list.php
// and offers/list.php).
require_fields($_GET, ['mall_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url FROM mall_ads
     WHERE mall_id = ? AND status = 'approved'
     ORDER BY created_at DESC"
);
$stmt->execute([$_GET['mall_id']]);

json_ok(['ads' => $stmt->fetchAll()]);
