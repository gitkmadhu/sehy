<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$data = body();
require_fields($data, ['name', 'email', 'password']);

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
if ($stmt->fetch()) {
    json_error('An account with this email already exists', 409);
}

$requestedRole = $data['role'] ?? 'shopper';
$role = in_array($requestedRole, ['shopper', 'store_owner'], true) ? $requestedRole : 'shopper';

$stmt = $pdo->prepare(
    'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
    $data['name'],
    $data['email'],
    password_hash($data['password'], PASSWORD_BCRYPT),
    $data['phone'] ?? null,
    $role,
]);

$userId = (int) $pdo->lastInsertId();
$token = issue_token($userId);

json_ok(['token' => $token, 'user' => [
    'id' => $userId,
    'name' => $data['name'],
    'email' => $data['email'],
    'role' => $role,
]], 201);
