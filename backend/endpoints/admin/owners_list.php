<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();
$owners = $pdo->query(
    "SELECT u.id, u.name, u.email, u.role, m.name AS category_name, s.name AS service_name
     FROM users u
     LEFT JOIN categories m ON m.id = u.category_id
     LEFT JOIN services s ON s.id = u.service_id
     WHERE u.role IN ('category_manager', 'service_owner')
     ORDER BY u.name ASC"
)->fetchAll();

json_ok(['owners' => $owners]);
