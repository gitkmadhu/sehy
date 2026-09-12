<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0'
);
$stmt->execute([$user['id']]);

json_ok(['count' => (int) $stmt->fetchColumn()]);
