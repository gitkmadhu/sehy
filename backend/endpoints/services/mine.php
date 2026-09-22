<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['service_owner', 'category_manager', 'service_staff', 'admin']);

$pdo = sehy_db();

if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null) {
        json_ok(['services' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS tag_name
         FROM services s
         LEFT JOIN tags c ON c.id = s.tag_id
         WHERE s.category_id = ?
         ORDER BY s.created_at DESC"
    );
    $stmt->execute([$user['category_id']]);
} elseif ($user['role'] === 'service_staff') {
    // Service staff represent exactly one service.
    if ($user['service_id'] === null) {
        json_ok(['services' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS tag_name
         FROM services s
         LEFT JOIN tags c ON c.id = s.tag_id
         WHERE s.id = ?"
    );
    $stmt->execute([$user['service_id']]);
} else {
    $stmt = $pdo->prepare(
        "SELECT s.*, c.name AS tag_name
         FROM services s
         LEFT JOIN tags c ON c.id = s.tag_id
         WHERE s.owner_id = ?
         ORDER BY s.created_at DESC"
    );
    $stmt->execute([$user['id']]);
}

json_ok(['services' => $stmt->fetchAll()]);
