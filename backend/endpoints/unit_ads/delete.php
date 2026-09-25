<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT unit_id, uploaded_by FROM unit_ads WHERE id = ?');
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();
if (!$ad) {
    json_error('Ad not found', 404);
}

$canDelete = is_admin($user)
    || (int) $ad['uploaded_by'] === (int) $user['id']
    || ($user['role'] === 'unit_manager' && $user['unit_id'] !== null && (int) $ad['unit_id'] === (int) $user['unit_id']);
if (!$canDelete) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM unit_ads WHERE id = ?')->execute([$data['id']]);

if (is_admin($user)) {
    log_admin_action($user, 'unit_ad.delete', 'unit_ad', $data['id'], ['unit_id' => $ad['unit_id']]);
}

json_ok(['deleted' => true]);
