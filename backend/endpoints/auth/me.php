<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body();
    $pdo = sehy_db();
    $fields = [];
    $params = [];
    foreach (['name', 'phone', 'avatar_url', 'fcm_token'] as $field) {
        if (isset($data[$field])) {
            $fields[] = "{$field} = ?";
            $params[] = $data[$field];
        }
    }
    if ($fields) {
        $params[] = $user['id'];
        $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')
            ->execute($params);
    }
    $stmt = $pdo->prepare(
        'SELECT u.*, m.name AS category_name, s.name AS service_name
         FROM users u
         LEFT JOIN categories m ON m.id = u.category_id
         LEFT JOIN services s ON s.id = u.service_id
         WHERE u.id = ?'
    );
    $stmt->execute([$user['id']]);
    $user = $stmt->fetch();
    unset($user['password_hash']);
}

json_ok(['user' => $user]);
