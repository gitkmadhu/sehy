<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT name FROM areas WHERE id = ?');
$stmt->execute([$data['id']]);
$area = $stmt->fetch();

$pdo->prepare('DELETE FROM areas WHERE id = ?')->execute([$data['id']]);

if ($area) {
    log_admin_action($user, 'area.delete', 'area', $data['id'], ['name' => $area['name']]);
}

json_ok(['deleted' => true]);
