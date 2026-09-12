<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT o.id, o.store_id, s.owner_id, s.mall_id FROM offers o JOIN stores s ON s.id = o.store_id WHERE o.id = ?'
);
$stmt->execute([$data['id']]);
$offer = $stmt->fetch();

if (!$offer) {
    json_error('Offer not found', 404);
}
if (!can_manage_store($user, $offer)) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM offers WHERE id = ?')->execute([$data['id']]);

json_ok(['deleted' => true]);
