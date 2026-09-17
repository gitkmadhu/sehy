<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = gmls_db();
$owners = $pdo->query(
    "SELECT u.id, u.name, u.email, u.role, m.name AS mall_name, s.name AS store_name
     FROM users u
     LEFT JOIN malls m ON m.id = u.mall_id
     LEFT JOIN stores s ON s.id = u.store_id
     WHERE u.role IN ('mall_manager', 'store_owner')
     ORDER BY u.name ASC"
)->fetchAll();

json_ok(['owners' => $owners]);
