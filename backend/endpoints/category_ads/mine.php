<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['category_staff', 'category_manager']);

$pdo = sehy_db();

if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null) {
        json_ok(['ads' => []]);
    }
    // A category manager sees every ad submitted for their category (any status), so
    // they can review pending ones.
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS uploaded_by_name
         FROM category_ads a
         JOIN users u ON u.id = a.uploaded_by
         WHERE a.category_id = ?
         ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['category_id']]);
} else {
    $stmt = $pdo->prepare(
        'SELECT * FROM category_ads WHERE uploaded_by = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$user['id']]);
}

json_ok(['ads' => $stmt->fetchAll()]);
