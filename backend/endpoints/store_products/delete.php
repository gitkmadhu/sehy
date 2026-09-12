<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT p.store_id, s.* FROM store_products p JOIN stores s ON s.id = p.store_id WHERE p.id = ?'
);
$stmt->execute([$data['id']]);
$product = $stmt->fetch();

if (!$product) {
    json_error('Product not found', 404);
}
if (!can_manage_store($user, $product)) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM store_products WHERE id = ?')->execute([$data['id']]);

json_ok(['deleted' => true]);
