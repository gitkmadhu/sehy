<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}

$pdo = sehy_db();

if ($data['status'] === 'approved') {
    $pdo->prepare("UPDATE users SET is_active = 1 WHERE id = ? AND role = 'category_manager'")
        ->execute([$data['id']]);
} else {
    $pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'category_manager' AND is_active = 0")
        ->execute([$data['id']]);
}

log_admin_action($user, 'signup.review', 'user', $data['id'], ['status' => $data['status']]);

json_ok(['id' => (int) $data['id'], 'status' => $data['status']]);
