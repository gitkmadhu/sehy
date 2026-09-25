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

$stmt = $pdo->prepare('SELECT id FROM units WHERE category_id = ? AND name = ?');
$stmt->execute([$data['category_id'], $name]);
if ($stmt->fetch()) {
    json_error('This category already has a unit with that name', 409);
}

$pdo->prepare('INSERT INTO units (category_id, name, description) VALUES (?, ?, ?)')
    ->execute([$data['category_id'], $name, trim($data['description'] ?? '') ?: null]);
$id = (int) $pdo->lastInsertId();

log_admin_action($user, 'unit.create', 'unit', $id, ['name' => $name]);

json_ok(['id' => $id], 201);
