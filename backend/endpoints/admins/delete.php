<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

if ((int) $data['id'] === (int) $user['id']) {
    json_error('You cannot delete your own account', 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ? AND role IN ('admin', 'super_admin')");
$stmt->execute([$data['id']]);
$target = $stmt->fetch();
if (!$target) {
    json_error('Admin account not found', 404);
}

// Never leave the system with zero super_admins — there'd be no one left
// who could create another one or manage admin accounts at all.
if ($target['role'] === 'super_admin') {
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'");
    if ((int) $stmt->fetchColumn() <= 1) {
        json_error('Cannot delete the last remaining super_admin', 422);
    }
}

$pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$data['id']]);

log_admin_action($user, 'admin.delete', 'user', $data['id'], ['role' => $target['role']]);

json_ok(['deleted' => true]);
