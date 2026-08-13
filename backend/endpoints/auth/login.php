<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$data = body();
require_fields($data, ['email', 'password']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
$user = $stmt->fetch();

if (!$user || !password_verify($data['password'], $user['password_hash'])) {
    json_error('Invalid email or password', 401);
}
if (!$user['is_active']) {
    json_error('This account has been deactivated', 403);
}

$token = issue_token((int) $user['id']);
unset($user['password_hash']);

json_ok(['token' => $token, 'user' => $user]);
