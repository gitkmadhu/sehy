<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$pdo->prepare("UPDATE contact_messages SET status = 'resolved' WHERE id = ?")
    ->execute([$data['id']]);

json_ok(['id' => (int) $data['id'], 'status' => 'resolved']);
