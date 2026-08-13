<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

if (empty($_GET['id'])) {
    json_error('Missing id', 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT o.*, s.name AS store_name, s.logo_url AS store_logo_url,
            s.address AS store_address, s.phone AS store_phone,
            s.latitude AS store_latitude, s.longitude AS store_longitude,
            c.name AS category_name
     FROM offers o
     JOIN stores s ON s.id = o.store_id
     LEFT JOIN categories c ON c.id = o.category_id
     WHERE o.id = ?"
);
$stmt->execute([$_GET['id']]);
$offer = $stmt->fetch();

if (!$offer) {
    json_error('Offer not found', 404);
}

$pdo->prepare('UPDATE offers SET views_count = views_count + 1 WHERE id = ?')
    ->execute([$offer['id']]);

json_ok(['offer' => $offer]);
