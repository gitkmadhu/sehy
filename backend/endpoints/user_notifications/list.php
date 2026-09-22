<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

$pdo = sehy_db();
// owner_message rows are this user's own outgoing messages to admin (see
// message_admin.php) — they live in this table so admin/owner_message_thread.php
// can pull the full two-way thread, but they aren't a notification *to* this
// user, so they're excluded from their own inbox here.
$stmt = $pdo->prepare(
    "SELECT id, type, title, body, data, is_read, created_at
     FROM user_notifications
     WHERE user_id = ? AND type != 'owner_message'
     ORDER BY created_at DESC
     LIMIT 50"
);
$stmt->execute([$user['id']]);
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    $row['data'] = $row['data'] !== null ? json_decode($row['data'], true) : null;
    $row['is_read'] = (bool) $row['is_read'];
}

json_ok(['notifications' => $rows]);
