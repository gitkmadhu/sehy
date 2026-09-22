<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT name, area FROM categories WHERE id = ?');
$stmt->execute([$data['id']]);
$category = $stmt->fetch();

$pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$data['id']]);

if ($category) {
    log_admin_action($user, 'category.delete', 'category', $data['id'], ['name' => $category['name'], 'area' => $category['area']]);
}

json_ok(['deleted' => true]);
