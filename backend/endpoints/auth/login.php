<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$data = body();
require_fields($data, ['email', 'password']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT u.*, m.name AS mall_name, s.name AS store_name
     FROM users u
     LEFT JOIN malls m ON m.id = u.mall_id
     LEFT JOIN stores s ON s.id = u.store_id
     WHERE u.email = ?'
);
$stmt->execute([$data['email']]);
$user = $stmt->fetch();

if (!$user || !password_verify($data['password'], $user['password_hash'])) {
    json_error('Invalid email or password', 401);
}
if (!$user['is_active']) {
    if ($user['role'] === 'mall_manager') {
        $message = 'Your account is pending admin approval.';
    } elseif ($user['role'] === 'store_owner') {
        $message = 'Your account will be active once your first store is approved.';
    } elseif ($user['role'] === 'mall_staff') {
        $message = 'Your account will be active once your first ad is approved by the mall manager.';
    } elseif ($user['role'] === 'store_staff') {
        $message = 'Your account will be active once your first submission is approved by the store manager.';
    } else {
        $message = 'This account has been deactivated';
    }
    json_error($message, 403);
}

$token = issue_token((int) $user['id']);
unset($user['password_hash']);

json_ok(['token' => $token, 'user' => $user]);
