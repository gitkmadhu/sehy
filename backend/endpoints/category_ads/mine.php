<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['category_staff', 'category_manager', 'unit_manager', 'unit_staff', 'service_owner', 'service_staff']);

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
} elseif ($user['role'] === 'unit_manager' && $user['unit_id'] !== null) {
    // The banners this unit has put on its category's page (own + its staff's).
    $stmt = $pdo->prepare(
        "SELECT a.*, c.name AS category_name FROM category_ads a JOIN categories c ON c.id = a.category_id
         WHERE a.unit_id = ? ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['unit_id']]);
} elseif ($user['role'] === 'service_owner') {
    $stmt = $pdo->prepare(
        "SELECT a.*, c.name AS category_name, s.name AS service_name
         FROM category_ads a JOIN categories c ON c.id = a.category_id JOIN services s ON s.id = a.service_id
         WHERE s.owner_id = ? ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['id']]);
} else {
    $stmt = $pdo->prepare(
        'SELECT * FROM category_ads WHERE uploaded_by = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$user['id']]);
}

json_ok(['ads' => $stmt->fetchAll()]);
