<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['service_staff', 'service_owner']);
require_fields($_POST, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'SELECT a.*, s.owner_id FROM service_ads a JOIN services s ON s.id = a.service_id WHERE a.id = ?'
);
$stmt->execute([$_POST['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canEdit = ($user['role'] === 'service_staff' && (int) $ad['uploaded_by'] === (int) $user['id'])
    || ($user['role'] === 'service_owner' && (int) $ad['owner_id'] === (int) $user['id']);

if (!$canEdit) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];

$imageUrl = save_upload('image', 'service_ads');
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

// A service manager already holds approval authority over their own service, so
// their edit publishes immediately; a service staff edit goes back to pending
// for re-approval — same reasoning as category_ads/update.php.
$fields[] = 'status = ?';
$params[] = $user['role'] === 'service_owner' ? 'approved' : 'pending';
$fields[] = 'edited_at = NOW()';

$params[] = $ad['id'];
$pdo->prepare('UPDATE service_ads SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

json_ok(['id' => (int) $ad['id']]);
