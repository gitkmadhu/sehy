<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();
$messages = $pdo->query(
    "SELECT c.*, u.name AS user_name, u.email AS user_email
     FROM contact_messages c JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC"
)->fetchAll();

json_ok(['messages' => $messages]);
