<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['store_owner', 'admin']);
require_fields($_POST, ['store_id', 'title', 'expires_at']);

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT * FROM stores WHERE id = ?');
$stmt->execute([$_POST['store_id']]);
$store = $stmt->fetch();

if (!$store) {
    json_error('Store not found', 404);
}
if ($store['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
    json_error('Forbidden: you do not own this store', 403);
}

$imageUrl = save_upload('image', 'offers');

$stmt = $pdo->prepare(
    'INSERT INTO offers
        (store_id, category_id, title, description, image_url,
         original_price, discounted_price, discount_percent, starts_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $store['id'],
    $_POST['category_id'] ?? $store['category_id'],
    $_POST['title'],
    $_POST['description'] ?? null,
    $imageUrl,
    $_POST['original_price'] ?? null,
    $_POST['discounted_price'] ?? null,
    $_POST['discount_percent'] ?? null,
    $_POST['starts_at'] ?? null,
    $_POST['expires_at'],
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => 'pending'], 201);
