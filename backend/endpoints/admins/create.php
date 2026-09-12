<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['name', 'email', 'password', 'role']);

if (!in_array($data['role'], ['admin', 'super_admin'], true)) {
    json_error("role must be 'admin' or 'super_admin'", 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
if ($stmt->fetch()) {
    json_error('An account with this email already exists', 409);
}

// Unlike every other role, admin/super_admin accounts are never created via
// the public register.php flow (it silently downgrades unrecognized roles
// to shopper) — this endpoint is the only way to create one, and only an
// existing super_admin can call it. Active immediately: there's no approval
// chain above super_admin to hand off to.
$stmt = $pdo->prepare(
    'INSERT INTO users (name, email, password_hash, phone, role, is_active)
     VALUES (?, ?, ?, ?, ?, 1)'
);
$stmt->execute([
    trim($data['name']),
    trim($data['email']),
    password_hash($data['password'], PASSWORD_BCRYPT),
    $data['phone'] ?? null,
    $data['role'],
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'name' => $data['name'], 'email' => $data['email'], 'role' => $data['role']], 201);
