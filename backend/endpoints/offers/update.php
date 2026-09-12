<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT o.*, s.owner_id, s.mall_id FROM offers o JOIN stores s ON s.id = o.store_id WHERE o.id = ?'
);
$stmt->execute([$_POST['id']]);
$offer = $stmt->fetch();

if (!$offer) {
    json_error('Offer not found', 404);
}
if (!can_manage_store($user, $offer)) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];
$editable = [
    'category_id', 'title', 'description', 'original_price',
    'discounted_price', 'discount_percent', 'starts_at', 'expires_at',
];
foreach ($editable as $field) {
    if (isset($_POST[$field])) {
        $fields[] = "{$field} = ?";
        $params[] = $_POST[$field];
    }
}

$imageUrl = save_upload('image', 'offers');
if ($imageUrl) {
    $fields[] = 'image_url = ?';
    $params[] = $imageUrl;
}

if (!is_admin($user)) {
    $fields[] = "status = 'pending'";
}

// Tracks who actually made this edit — lets the store manager approve an
// edit their own store_staff submitted, without ever approving their own.
$fields[] = 'submitted_by = ?';
$params[] = $user['id'];

if ($fields) {
    $params[] = $offer['id'];
    $pdo->prepare('UPDATE offers SET ' . implode(', ', $fields) . ' WHERE id = ?')
        ->execute($params);
}

json_ok(['id' => (int) $offer['id']]);
