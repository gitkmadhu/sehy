<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['name']);
$name = trim($data['name']);

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT id FROM areas WHERE name = ?');
$stmt->execute([$name]);
if ($stmt->fetch()) {
    json_error('This area already exists', 409);
}

$pdo->prepare('INSERT INTO areas (name) VALUES (?)')->execute([$name]);
$newAreaId = (int) $pdo->lastInsertId();

log_admin_action($user, 'area.create', 'area', $newAreaId, ['name' => $name]);

json_ok(['id' => $newAreaId, 'name' => $name], 201);
