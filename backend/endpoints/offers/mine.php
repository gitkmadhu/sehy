<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['store_owner', 'admin']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT o.*, s.name AS store_name
     FROM offers o
     JOIN stores s ON s.id = o.store_id
     WHERE s.owner_id = ?
     ORDER BY o.created_at DESC"
);
$stmt->execute([$user['id']]);

json_ok(['offers' => $stmt->fetchAll()]);
