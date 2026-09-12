<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['store_staff', 'store_owner']);
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT a.*, s.owner_id FROM store_ads a JOIN stores s ON s.id = a.store_id WHERE a.id = ?'
);
$stmt->execute([$_POST['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canEdit = ($user['role'] === 'store_staff' && (int) $ad['uploaded_by'] === (int) $user['id'])
    || ($user['role'] === 'store_owner' && (int) $ad['owner_id'] === (int) $user['id']);

if (!$canEdit) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];

$imageUrl = save_upload('image', 'store_ads');
if ($imageUrl) {
    $fields[] = 'image_url = ?';
    $params[] = $imageUrl;
}
if (isset($_POST['link_url'])) {
    $fields[] = 'link_url = ?';
    $params[] = $_POST['link_url'];
}
if (isset($_POST['product_name'])) {
    $fields[] = 'product_name = ?';
    $params[] = trim($_POST['product_name']) ?: null;
}
if (isset($_POST['brand_name'])) {
    $fields[] = 'brand_name = ?';
    $params[] = trim($_POST['brand_name']) ?: null;
}

// A store manager already holds approval authority over their own store, so
// their edit publishes immediately; a store staff edit goes back to pending
// for re-approval — same reasoning as mall_ads/update.php.
$fields[] = 'status = ?';
$params[] = $user['role'] === 'store_owner' ? 'approved' : 'pending';
$fields[] = 'edited_at = NOW()';

$params[] = $ad['id'];
$pdo->prepare('UPDATE store_ads SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

json_ok(['id' => (int) $ad['id']]);
