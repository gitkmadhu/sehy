<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
$data = body();
require_fields($data, ['offer_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'DELETE FROM favorites WHERE user_id = ? AND offer_id = ?'
);
$stmt->execute([$user['id'], $data['offer_id']]);

json_ok(['favorited' => false]);
