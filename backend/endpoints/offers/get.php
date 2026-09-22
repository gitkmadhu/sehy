<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

if (empty($_GET['id'])) {
    json_error('Missing id', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT o.*, s.name AS service_name, s.logo_url AS service_logo_url,
            s.address AS service_address, s.phone AS service_phone,
            s.latitude AS service_latitude, s.longitude AS service_longitude,
            c.name AS tag_name
     FROM offers o
     JOIN services s ON s.id = o.service_id
     LEFT JOIN tags c ON c.id = o.tag_id
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
