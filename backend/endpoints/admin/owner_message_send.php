<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['user_id', 'message']);

$pdo = gmls_db();
$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role IN ('mall_manager', 'store_owner')");
$stmt->execute([$data['user_id']]);
if (!$stmt->fetch()) {
    json_error('Owner not found', 404);
}

$message = trim($data['message']);
if ($message === '') {
    json_error('Message cannot be empty', 422);
}

$stmt = $pdo->prepare(
    'INSERT INTO user_notifications (user_id, type, title, body, data)
     VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
    $data['user_id'],
    'admin_message',
    'Message from GLML Admin',
    $message,
    json_encode(['from' => $user['name']]),
]);

log_admin_action($user, 'owner_message.send', 'user', $data['user_id'], ['message' => $message]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
