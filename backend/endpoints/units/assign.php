<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['service_id']);

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT id FROM services WHERE id = ?');
$stmt->execute([$data['service_id']]);
if (!$stmt->fetch()) {
    json_error('Service not found', 404);
}

$unitId = empty($data['unit_id']) ? null : (int) $data['unit_id'];
$categoryId = null;
if ($unitId !== null) {
    $stmt = $pdo->prepare('SELECT category_id FROM units WHERE id = ?');
    $stmt->execute([$unitId]);
    $unit = $stmt->fetch();
    if (!$unit) {
        json_error('Unit not found', 404);
    }
    // A service lives in its unit's category.
    $categoryId = (int) $unit['category_id'];
}

if ($categoryId !== null) {
    $pdo->prepare('UPDATE services SET unit_id = ?, category_id = ? WHERE id = ?')
        ->execute([$unitId, $categoryId, $data['service_id']]);
} else {
    $pdo->prepare('UPDATE services SET unit_id = NULL WHERE id = ?')->execute([$data['service_id']]);
}

log_admin_action($user, 'unit.assign', 'service', $data['service_id'], ['unit_id' => $unitId]);

json_ok(['service_id' => (int) $data['service_id'], 'unit_id' => $unitId]);
