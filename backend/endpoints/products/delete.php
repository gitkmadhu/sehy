<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT name FROM products WHERE id = ?');
$stmt->execute([$data['id']]);
$product = $stmt->fetch();

// service_catalog_items rows for it are removed automatically (ON DELETE CASCADE).
$pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$data['id']]);

if ($product) {
    log_admin_action($user, 'product.delete', 'product', $data['id'], ['name' => $product['name']]);
}

json_ok(['deleted' => true]);
