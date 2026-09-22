<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

if (empty($_GET['id'])) {
    json_error('Missing id', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare(
    "SELECT s.*, c.name AS tag_name, m.name AS category_name
     FROM services s
     LEFT JOIN tags c ON c.id = s.tag_id
     LEFT JOIN categories m ON m.id = s.category_id
     WHERE s.id = ?"
);
$stmt->execute([$_GET['id']]);
$service = $stmt->fetch();

if (!$service) {
    json_error('Service not found', 404);
}

json_ok(['service' => $service]);
