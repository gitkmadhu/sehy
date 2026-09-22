<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'SELECT p.service_id, s.* FROM service_products p JOIN services s ON s.id = p.service_id WHERE p.id = ?'
);
$stmt->execute([$data['id']]);
$product = $stmt->fetch();

if (!$product) {
    json_error('Product not found', 404);
}
if (!can_manage_service($user, $product)) {
    json_error('Forbidden', 403);
}

$pdo->prepare('DELETE FROM service_products WHERE id = ?')->execute([$data['id']]);

json_ok(['deleted' => true]);
