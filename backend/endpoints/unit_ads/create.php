<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['unit_manager', 'unit_staff', 'admin']);

$pdo = sehy_db();

// An admin picks the unit explicitly; a unit manager/staff always publishes
// for their own unit.
if (is_admin($user)) {
    require_fields($_POST, ['unit_id']);
    $stmt = $pdo->prepare('SELECT id FROM units WHERE id = ?');
    $stmt->execute([$_POST['unit_id']]);
    if (!$stmt->fetch()) {
        json_error('Unit not found', 404);
    }
    $unitId = (int) $_POST['unit_id'];
} else {
    if ($user['unit_id'] === null) {
        json_error('Your account is not linked to a unit yet. Contact the admin.', 422);
    }
    $unitId = (int) $user['unit_id'];
}

$imageUrl = save_upload('image', 'unit_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

$pdo->prepare('INSERT INTO unit_ads (unit_id, uploaded_by, image_url, link_url, status) VALUES (?, ?, ?, ?, ?)')
    ->execute([$unitId, $user['id'], $imageUrl, $_POST['link_url'] ?? null, 'approved']);
$adId = (int) $pdo->lastInsertId();

if (is_admin($user)) {
    log_admin_action($user, 'unit_ad.create', 'unit_ad', $adId, ['unit_id' => $unitId]);
}

json_ok(['id' => $adId, 'status' => 'approved'], 201);
