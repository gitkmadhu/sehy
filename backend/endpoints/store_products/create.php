<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_fields($_POST, ['store_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM stores WHERE id = ?');
$stmt->execute([$_POST['store_id']]);
$store = $stmt->fetch();

if (!$store) {
    json_error('Store not found', 404);
}
if (!can_manage_store($user, $store)) {
    json_error('Forbidden', 403);
}

// No approval chain, unlike offers/ads — plain product photos are lower
// stakes, so both the owner and their staff can publish one immediately.
$imageUrl = save_upload('image', 'store_products', UPLOAD_GALLERY_MAX_DIMENSION);
if (!$imageUrl) {
    json_error('An image is required', 422);
}

$stmt = $pdo->prepare(
    'INSERT INTO store_products (store_id, image_url, caption, uploaded_by) VALUES (?, ?, ?, ?)'
);
$stmt->execute([
    (int) $store['id'],
    $imageUrl,
    $_POST['caption'] ?? null,
    $user['id'],
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'image_url' => $imageUrl], 201);
