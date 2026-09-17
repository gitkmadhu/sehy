<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT name, city FROM malls WHERE id = ?');
$stmt->execute([$data['id']]);
$mall = $stmt->fetch();

$pdo->prepare('DELETE FROM malls WHERE id = ?')->execute([$data['id']]);

if ($mall) {
    log_admin_action($user, 'mall.delete', 'mall', $data['id'], ['name' => $mall['name'], 'city' => $mall['city']]);
}

json_ok(['deleted' => true]);
