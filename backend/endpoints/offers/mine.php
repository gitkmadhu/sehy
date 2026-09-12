<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['store_owner', 'mall_manager', 'store_staff', 'admin']);

$pdo = gmls_db();

if ($user['role'] === 'mall_manager') {
    if ($user['mall_id'] === null) {
        json_ok(['offers' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS store_name
         FROM offers o
         JOIN stores s ON s.id = o.store_id
         WHERE s.mall_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['mall_id']]);
} elseif ($user['role'] === 'store_staff') {
    if ($user['store_id'] === null) {
        json_ok(['offers' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS store_name
         FROM offers o
         JOIN stores s ON s.id = o.store_id
         WHERE s.id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['store_id']]);
} else {
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS store_name
         FROM offers o
         JOIN stores s ON s.id = o.store_id
         WHERE s.owner_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['id']]);
}

json_ok(['offers' => $stmt->fetchAll()]);
