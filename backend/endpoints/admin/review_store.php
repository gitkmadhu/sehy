<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected', 'suspended'], true)) {
    json_error('status must be approved, rejected, or suspended', 422);
}

$pdo = gmls_db();
$pdo->prepare('UPDATE stores SET status = ? WHERE id = ?')
    ->execute([$data['status'], $data['id']]);

json_ok(['id' => (int) $data['id'], 'status' => $data['status']]);
