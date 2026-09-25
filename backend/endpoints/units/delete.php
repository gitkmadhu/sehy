<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT name FROM units WHERE id = ?');
$stmt->execute([$data['id']]);
$unit = $stmt->fetch();

// services.unit_id is ON DELETE SET NULL, so its services just become unassigned.
$pdo->prepare('DELETE FROM units WHERE id = ?')->execute([$data['id']]);

if ($unit) {
    log_admin_action($user, 'unit.delete', 'unit', $data['id'], ['name' => $unit['name']]);
}

json_ok(['deleted' => true]);
