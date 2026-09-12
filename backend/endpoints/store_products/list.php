<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public endpoint — powers the product gallery on a store's own page.
require_fields($_GET, ['store_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT id, image_url, caption FROM store_products WHERE store_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$_GET['store_id']]);

json_ok(['products' => $stmt->fetchAll()]);
