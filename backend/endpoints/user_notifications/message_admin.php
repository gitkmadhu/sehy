<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['category_manager', 'service_owner']);

$data = body();
require_fields($data, ['message']);

$message = trim($data['message']);
if ($message === '') {
    json_error('Message cannot be empty', 422);
}

$pdo = sehy_db();
// Stored under this user's own id and read back by admin/owner_message_thread.php
// (the "thread for this owner"), not by this user's own list.php — see the
// type exclusion there. is_read is set so it never inflates their own
// unread_count either.
$stmt = $pdo->prepare(
    "INSERT INTO user_notifications (user_id, type, title, body, data, is_read)
     VALUES (?, 'owner_message', 'Message to Sehy Admin', ?, ?, 1)"
);
$stmt->execute([
    $user['id'],
    $message,
    json_encode(['from' => $user['name'], 'role' => $user['role']]),
]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
