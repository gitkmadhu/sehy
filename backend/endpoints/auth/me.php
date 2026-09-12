<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body();
    $pdo = gmls_db();
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
        'SELECT u.*, m.name AS mall_name, s.name AS store_name
         FROM users u
         LEFT JOIN malls m ON m.id = u.mall_id
         LEFT JOIN stores s ON s.id = u.store_id
         WHERE u.id = ?'
    );
    $stmt->execute([$user['id']]);
    $user = $stmt->fetch();
    unset($user['password_hash']);
}

json_ok(['user' => $user]);
