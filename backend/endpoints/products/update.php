<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
$stmt->execute([$data['id']]);
$product = $stmt->fetch();
if (!$product) {
    json_error('Product not found', 404);
}

$name = array_key_exists('name', $data) ? trim($data['name']) : $product['name'];
if ($name === '') {
    json_error('Name cannot be empty', 422);
}
$sortOrder = isset($data['sort_order']) ? (int) $data['sort_order'] : (int) $product['sort_order'];

$stmt = $pdo->prepare('SELECT id FROM products WHERE category_id = ? AND name = ? AND id <> ?');
$stmt->execute([$product['category_id'], $name, $product['id']]);
if ($stmt->fetch()) {
    json_error('This category already has a product with that name', 409);
}

$pdo->prepare('UPDATE products SET name = ?, sort_order = ? WHERE id = ?')
    ->execute([$name, $sortOrder, $product['id']]);

log_admin_action($user, 'product.update', 'product', $product['id'], ['name' => $name]);

json_ok(['id' => (int) $product['id']]);
