<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
);
$stmt->execute([$data['id'], $user['id']]);

json_ok(['id' => (int) $data['id'], 'is_read' => true]);
