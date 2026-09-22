<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT o.*, s.name AS service_name, s.logo_url AS service_logo_url
     FROM favorites f
     JOIN offers o ON o.id = f.offer_id
     JOIN services s ON s.id = o.service_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC"
);
$stmt->execute([$user['id']]);

json_ok(['offers' => $stmt->fetchAll()]);
