<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['store_staff', 'store_owner']);

$pdo = gmls_db();

if ($user['role'] === 'store_owner') {
    // A store manager sees every ad submitted for any of their stores (any
    // status), so they can review pending ones.
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS uploaded_by_name
         FROM store_ads a
         JOIN stores s ON s.id = a.store_id
         JOIN users u ON u.id = a.uploaded_by
         WHERE s.owner_id = ?
         ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['id']]);
} else {
    if ($user['store_id'] === null) {
        json_ok(['ads' => []]);
    }
    $stmt = $pdo->prepare(
        'SELECT * FROM store_ads WHERE store_id = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$user['store_id']]);
}

json_ok(['ads' => $stmt->fetchAll()]);
