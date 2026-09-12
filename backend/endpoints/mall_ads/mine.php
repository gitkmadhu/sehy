<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['mall_staff', 'mall_manager']);

$pdo = gmls_db();

if ($user['role'] === 'mall_manager') {
    if ($user['mall_id'] === null) {
        json_ok(['ads' => []]);
    }
    // A mall manager sees every ad submitted for their mall (any status), so
    // they can review pending ones.
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS uploaded_by_name
         FROM mall_ads a
         JOIN users u ON u.id = a.uploaded_by
         WHERE a.mall_id = ?
         ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['mall_id']]);
} else {
    $stmt = $pdo->prepare(
        'SELECT * FROM mall_ads WHERE uploaded_by = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$user['id']]);
}

json_ok(['ads' => $stmt->fetchAll()]);
