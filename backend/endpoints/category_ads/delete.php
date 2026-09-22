<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT category_id, uploaded_by FROM category_ads WHERE id = ?');
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canDelete = is_admin($user)
    || (int) $ad['uploaded_by'] === (int) $user['id']
    || ($user['role'] === 'category_manager' && $user['category_id'] !== null && (int) $ad['category_id'] === (int) $user['category_id']);

if (!$canDelete) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM category_ads WHERE id = ?')->execute([$data['id']]);

if (is_admin($user)) {
    log_admin_action($user, 'category_ad.delete', 'category_ad', $data['id'], ['category_id' => $ad['category_id']]);
}

json_ok(['deleted' => true]);
