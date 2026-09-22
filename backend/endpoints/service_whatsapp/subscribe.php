<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['service_id']);

if (empty($user['phone'])) {
    json_error('Add a phone number to your profile before subscribing.', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT id FROM services WHERE id = ?');
$stmt->execute([$data['service_id']]);
if (!$stmt->fetch()) {
    json_error('Service not found', 404);
}

$stmt = $pdo->prepare(
    'INSERT IGNORE INTO service_whatsapp_subscribers (service_id, user_id, phone) VALUES (?, ?, ?)'
);
$stmt->execute([$data['service_id'], $user['id'], $user['phone']]);

json_ok(['subscribed' => true], 201);
