<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$pdo->prepare('DELETE FROM user_notifications WHERE id = ? AND user_id = ?')
    ->execute([$data['id'], $user['id']]);

json_ok(['deleted' => true]);
