<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT a.store_id, a.uploaded_by, s.owner_id FROM store_ads a JOIN stores s ON s.id = a.store_id WHERE a.id = ?'
);
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canDelete = is_admin($user)
    || (int) $ad['uploaded_by'] === (int) $user['id']
    || ($user['role'] === 'store_owner' && (int) $ad['owner_id'] === (int) $user['id']);

if (!$canDelete) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM store_ads WHERE id = ?')->execute([$data['id']]);

json_ok(['deleted' => true]);
