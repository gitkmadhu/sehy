<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = gmls_db();

$stores = $pdo->query(
    "SELECT s.*, u.name AS owner_name, u.email AS owner_email
     FROM stores s JOIN users u ON u.id = s.owner_id
     WHERE s.status = 'pending' ORDER BY s.created_at ASC"
)->fetchAll();

$offers = $pdo->query(
    "SELECT o.*, s.name AS store_name
     FROM offers o JOIN stores s ON s.id = o.store_id
     WHERE o.status = 'pending' ORDER BY o.created_at ASC"
)->fetchAll();

json_ok(['stores' => $stores, 'offers' => $offers]);
