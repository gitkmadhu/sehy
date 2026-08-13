<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['store_owner', 'admin']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    "SELECT s.*, c.name AS category_name
     FROM stores s
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.owner_id = ?
     ORDER BY s.created_at DESC"
);
$stmt->execute([$user['id']]);

json_ok(['stores' => $stmt->fetchAll()]);
