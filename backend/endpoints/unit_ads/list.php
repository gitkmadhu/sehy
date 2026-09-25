<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public — powers the banner carousel on a unit's own page.
require_fields($_GET, ['unit_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url FROM unit_ads WHERE unit_id = ? AND status = 'approved' ORDER BY created_at DESC"
);
$stmt->execute([$_GET['unit_id']]);

json_ok(['ads' => $stmt->fetchAll()]);
