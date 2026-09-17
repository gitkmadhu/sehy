<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);
require_fields($_GET, ['user_id']);

// Both directions of the same owner's thread live under their own user_id —
// 'admin_message' rows are what admin sent them, 'owner_message' rows are
// what they sent to admin (see user_notifications/message_admin.php). $type
// tells the frontend which side of the conversation each row belongs to.
$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT id, type, body, data, created_at FROM user_notifications
     WHERE user_id = ? AND type IN ('admin_message', 'owner_message')
     ORDER BY created_at ASC"
);
$stmt->execute([$_GET['user_id']]);
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    $row['data'] = $row['data'] !== null ? json_decode($row['data'], true) : null;
}

json_ok(['messages' => $rows]);
