<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

if (empty($_GET['id'])) {
    json_error('Missing id', 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT s.*, c.name AS category_name, m.name AS mall_name
     FROM stores s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN malls m ON m.id = s.mall_id
     WHERE s.id = ?"
);
$stmt->execute([$_GET['id']]);
$store = $stmt->fetch();

if (!$store) {
    json_error('Store not found', 404);
}

json_ok(['store' => $store]);
