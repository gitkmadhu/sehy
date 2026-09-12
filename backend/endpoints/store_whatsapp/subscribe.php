<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['store_id']);

if (empty($user['phone'])) {
    json_error('Add a phone number to your profile before subscribing.', 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT id FROM stores WHERE id = ?');
$stmt->execute([$data['store_id']]);
if (!$stmt->fetch()) {
    json_error('Store not found', 404);
}

$stmt = $pdo->prepare(
    'INSERT IGNORE INTO store_whatsapp_subscribers (store_id, user_id, phone) VALUES (?, ?, ?)'
);
$stmt->execute([$data['store_id'], $user['id'], $user['phone']]);

json_ok(['subscribed' => true], 201);
