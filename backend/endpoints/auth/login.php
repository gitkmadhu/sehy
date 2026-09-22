<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$data = body();
require_fields($data, ['email', 'password']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'SELECT u.*, m.name AS category_name, s.name AS service_name
     FROM users u
     LEFT JOIN categories m ON m.id = u.category_id
     LEFT JOIN services s ON s.id = u.service_id
     WHERE u.email = ?'
);
$stmt->execute([$data['email']]);
$user = $stmt->fetch();

if (!$user || !password_verify($data['password'], $user['password_hash'])) {
    record_incident('login_failed', 'warning', ['email' => $data['email']], dedupeKey: "email:{$data['email']}", dedupeWindowMinutes: 15);
    json_error('Invalid email or password', 401);
}
if (!$user['is_active']) {
    if ($user['role'] === 'category_manager') {
        $message = 'Your account is pending admin approval.';
    } elseif ($user['role'] === 'service_owner') {
        $message = 'Your account will be active once your first service is approved.';
    } elseif ($user['role'] === 'category_staff') {
        $message = 'Your account will be active once your first ad is approved by the category manager.';
    } elseif ($user['role'] === 'service_staff') {
        $message = 'Your account will be active once your first submission is approved by the service manager.';
    } else {
        $message = 'This account has been deactivated';
    }
    json_error($message, 403);
}

$token = issue_token((int) $user['id']);
unset($user['password_hash']);

json_ok(['token' => $token, 'user' => $user]);
