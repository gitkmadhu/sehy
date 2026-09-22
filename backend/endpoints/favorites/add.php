<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['offer_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'INSERT IGNORE INTO favorites (user_id, offer_id) VALUES (?, ?)'
);
$stmt->execute([$user['id'], $data['offer_id']]);

json_ok(['favorited' => true], 201);
