<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['current_password', 'new_password']);

if (strlen($data['new_password']) < 8) {
    json_error('New password must be at least 8 characters', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$row = $stmt->fetch();

if (!password_verify($data['current_password'], $row['password_hash'])) {
    json_error('Current password is incorrect', 401);
}

$pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    ->execute([password_hash($data['new_password'], PASSWORD_BCRYPT), $user['id']]);

json_ok(['changed' => true]);
