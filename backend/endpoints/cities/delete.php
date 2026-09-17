<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT name FROM cities WHERE id = ?');
$stmt->execute([$data['id']]);
$city = $stmt->fetch();

$pdo->prepare('DELETE FROM cities WHERE id = ?')->execute([$data['id']]);

if ($city) {
    log_admin_action($user, 'city.delete', 'city', $data['id'], ['name' => $city['name']]);
}

json_ok(['deleted' => true]);
