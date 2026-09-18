<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../config/migration.php';

if (!hash_equals(MIGRATION_API_KEY, raw_authorization_header())) {
    json_error('Unauthorized', 401);
}

$pdo = gmls_db();
$email = 'superadmin@gmls.local';

$stmt = $pdo->prepare('SELECT id, email, role, is_active, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    json_error("No user found with email {$email}", 404);
}

$before = [
    'id' => $user['id'],
    'role' => $user['role'],
    'is_active' => $user['is_active'],
    'hash_len' => strlen($user['password_hash']),
    'hash_prefix' => substr($user['password_hash'], 0, 7),
];

$newHash = password_hash('SuperAdmin@123', PASSWORD_BCRYPT);
$update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$update->execute([$newHash, $user['id']]);

json_ok(['before' => $before, 'reset' => true]);
