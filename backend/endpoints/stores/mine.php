<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['store_owner', 'mall_manager', 'store_staff', 'admin']);

$pdo = gmls_db();

if ($user['role'] === 'mall_manager') {
    if ($user['mall_id'] === null) {
        json_ok(['stores' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS category_name
         FROM stores s
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.mall_id = ?
         ORDER BY s.created_at DESC"
    );
    $stmt->execute([$user['mall_id']]);
} elseif ($user['role'] === 'store_staff') {
    // Store staff represent exactly one store.
    if ($user['store_id'] === null) {
        json_ok(['stores' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS category_name
         FROM stores s
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.id = ?"
    );
    $stmt->execute([$user['store_id']]);
} else {
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS category_name
         FROM stores s
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.owner_id = ?
         ORDER BY s.created_at DESC"
    );
    $stmt->execute([$user['id']]);
}

json_ok(['stores' => $stmt->fetchAll()]);
