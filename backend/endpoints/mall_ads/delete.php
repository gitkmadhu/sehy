<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT mall_id, uploaded_by FROM mall_ads WHERE id = ?');
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canDelete = is_admin($user)
    || (int) $ad['uploaded_by'] === (int) $user['id']
    || ($user['role'] === 'mall_manager' && $user['mall_id'] !== null && (int) $ad['mall_id'] === (int) $user['mall_id']);

if (!$canDelete) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM mall_ads WHERE id = ?')->execute([$data['id']]);

if (is_admin($user)) {
    log_admin_action($user, 'mall_ad.delete', 'mall_ad', $data['id'], ['mall_id' => $ad['mall_id']]);
}

json_ok(['deleted' => true]);
