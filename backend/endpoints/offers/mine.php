<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['service_owner', 'category_manager', 'service_staff', 'admin']);

$pdo = sehy_db();

if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null) {
        json_ok(['offers' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS service_name
         FROM offers o
         JOIN services s ON s.id = o.service_id
         WHERE s.category_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['category_id']]);
} elseif ($user['role'] === 'service_staff') {
    if ($user['service_id'] === null) {
        json_ok(['offers' => []]);
    }
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS service_name
         FROM offers o
         JOIN services s ON s.id = o.service_id
         WHERE s.id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['service_id']]);
} else {
    $stmt = $pdo->prepare(
        "SELECT o.*, s.name AS service_name
         FROM offers o
         JOIN services s ON s.id = o.service_id
         WHERE s.owner_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->execute([$user['id']]);
}

json_ok(['offers' => $stmt->fetchAll()]);
