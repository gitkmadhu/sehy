<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ? AND role IN ('admin', 'super_admin')");
$stmt->execute([$data['id']]);
$target = $stmt->fetch();
if (!$target) {
    json_error('Admin account not found', 404);
}

$fields = [];
$params = [];

if (isset($data['name'])) {
    $fields[] = 'name = ?';
    $params[] = trim($data['name']);
}
if (isset($data['phone'])) {
    $fields[] = 'phone = ?';
    $params[] = $data['phone'] === '' ? null : $data['phone'];
}
if (isset($data['is_active'])) {
    // A super_admin can't deactivate their own account — otherwise a lone
    // super_admin could lock themselves out with no one left to undo it.
    if ((int) $data['id'] === (int) $user['id'] && !$data['is_active']) {
        json_error('You cannot deactivate your own account', 422);
    }
    $fields[] = 'is_active = ?';
    $params[] = $data['is_active'] ? 1 : 0;
}

if ($fields) {
    $params[] = $data['id'];
    $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
}

json_ok(['id' => (int) $data['id']]);
