<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the product gallery on a service's own page.
require_fields($_GET, ['service_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'SELECT id, image_url, caption FROM service_products WHERE service_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$_GET['service_id']]);

json_ok(['products' => $stmt->fetchAll()]);
