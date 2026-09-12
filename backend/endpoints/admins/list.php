<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();
$stmt = $pdo->query(
    "SELECT id, name, email, phone, role, is_active, created_at
     FROM users WHERE role IN ('admin', 'super_admin')
     ORDER BY role DESC, name ASC"
);

json_ok(['admins' => $stmt->fetchAll()]);
