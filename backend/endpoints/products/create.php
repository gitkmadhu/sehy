<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['category_id', 'name']);
$name = trim($data['name']);
if ($name === '') {
    json_error('Name is required', 422);
}

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
$stmt->execute([$data['category_id']]);
if (!$stmt->fetch()) {
    json_error('Category not found', 404);
}

$stmt = $pdo->prepare('SELECT id FROM products WHERE category_id = ? AND name = ?');
$stmt->execute([$data['category_id'], $name]);
if ($stmt->fetch()) {
    json_error('This category already has a product with that name', 409);
}

$stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM products WHERE category_id = ?');
$stmt->execute([$data['category_id']]);
$sortOrder = isset($data['sort_order']) ? (int) $data['sort_order'] : (int) $stmt->fetchColumn();

$pdo->prepare('INSERT INTO products (category_id, name, sort_order) VALUES (?, ?, ?)')
    ->execute([$data['category_id'], $name, $sortOrder]);
$id = (int) $pdo->lastInsertId();

log_admin_action($user, 'product.create', 'product', $id, ['name' => $name]);

json_ok(['id' => $id], 201);
