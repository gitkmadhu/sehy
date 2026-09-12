<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = gmls_db();

// Includes 'manager_approved' stores/ads — signed off by their mall/store
// manager but still awaiting this final admin publish step.
$stores = $pdo->query(
    "SELECT s.*, u.name AS owner_name, u.email AS owner_email
     FROM stores s JOIN users u ON u.id = s.owner_id
     WHERE s.status IN ('pending', 'manager_approved') ORDER BY s.created_at ASC"
)->fetchAll();

$offers = $pdo->query(
    "SELECT o.*, s.name AS store_name
     FROM offers o JOIN stores s ON s.id = o.store_id
     WHERE o.status = 'pending' ORDER BY o.created_at ASC"
)->fetchAll();

$ads = $pdo->query(
    "SELECT a.*, m.name AS mall_name, u.name AS uploaded_by_name
     FROM mall_ads a JOIN malls m ON m.id = a.mall_id
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.status IN ('pending', 'manager_approved') ORDER BY a.created_at ASC"
)->fetchAll();

$storeAds = $pdo->query(
    "SELECT a.*, s.name AS store_name, u.name AS uploaded_by_name
     FROM store_ads a JOIN stores s ON s.id = a.store_id
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.status IN ('pending', 'manager_approved') ORDER BY a.created_at ASC"
)->fetchAll();

// Includes 'manager_approved' malls — signed off by their mall manager but
// still awaiting this final admin publish step — same as stores/ads above.
$malls = $pdo->query(
    "SELECT * FROM malls WHERE status IN ('pending', 'manager_approved') ORDER BY updated_at ASC"
)->fetchAll();

$mallManagers = $pdo->query(
    "SELECT u.id, u.name, u.email, u.mall_id, m.name AS mall_name, u.created_at
     FROM users u JOIN malls m ON m.id = u.mall_id
     WHERE u.role = 'mall_manager' AND u.is_active = 0
     ORDER BY u.created_at ASC"
)->fetchAll();

json_ok([
    'stores' => $stores,
    'offers' => $offers,
    'ads' => $ads,
    'store_ads' => $storeAds,
    'malls' => $malls,
    'mall_managers' => $mallManagers,
]);
