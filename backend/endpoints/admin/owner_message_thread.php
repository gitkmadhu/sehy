<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);
require_fields($_GET, ['user_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT id, body, data, created_at FROM user_notifications
     WHERE user_id = ? AND type = 'admin_message'
     ORDER BY created_at ASC"
);
$stmt->execute([$_GET['user_id']]);
$rows = $stmt->fetchAll();

foreach ($rows as &$row) {
    $row['data'] = $row['data'] !== null ? json_decode($row['data'], true) : null;
}

json_ok(['messages' => $rows]);
