<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['unit_manager', 'unit_staff']);

if ($user['unit_id'] === null) {
    json_error('Your account is not linked to a unit yet. Contact the admin.', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'SELECT u.*, c.name AS category_name FROM units u JOIN categories c ON c.id = u.category_id WHERE u.id = ?'
);
$stmt->execute([$user['unit_id']]);
$unit = $stmt->fetch();
if (!$unit) {
    json_error('Unit not found', 404);
}

$stmt = $pdo->prepare(
    "SELECT id, image_url, link_url, status, created_at FROM unit_ads WHERE unit_id = ? ORDER BY created_at DESC"
);
$stmt->execute([$unit['id']]);
$unit['ads'] = $stmt->fetchAll();

json_ok(['unit' => $unit]);
