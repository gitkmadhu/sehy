<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();

$data = body();
require_fields($data, ['query_type', 'description']);

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'INSERT INTO contact_messages (user_id, query_type, city, description) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$user['id'], $data['query_type'], $data['city'] ?? null, $data['description']]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
