<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['service_staff', 'service_owner']);

$pdo = sehy_db();

if ($user['role'] === 'service_owner') {
    // A service manager sees every ad submitted for any of their services (any
    // status), so they can review pending ones.
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS uploaded_by_name
         FROM service_ads a
         JOIN services s ON s.id = a.service_id
         JOIN users u ON u.id = a.uploaded_by
         WHERE s.owner_id = ?
         ORDER BY a.created_at DESC"
    );
    $stmt->execute([$user['id']]);
} else {
    if ($user['service_id'] === null) {
        json_ok(['ads' => []]);
    }
    $stmt = $pdo->prepare(
        'SELECT * FROM service_ads WHERE service_id = ? ORDER BY created_at DESC'
    );
    $stmt->execute([$user['service_id']]);
}

json_ok(['ads' => $stmt->fetchAll()]);
