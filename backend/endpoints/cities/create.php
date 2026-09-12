<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['name']);
$name = trim($data['name']);

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT id FROM cities WHERE name = ?');
$stmt->execute([$name]);
if ($stmt->fetch()) {
    json_error('This city already exists', 409);
}

$pdo->prepare('INSERT INTO cities (name) VALUES (?)')->execute([$name]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'name' => $name], 201);
