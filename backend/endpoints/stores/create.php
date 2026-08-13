<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['store_owner', 'admin']);

require_fields($_POST, ['name']);

$pdo = gmls_db();
$logoUrl = save_upload('logo', 'stores');
$coverUrl = save_upload('cover', 'stores');

$stmt = $pdo->prepare(
    'INSERT INTO stores
        (owner_id, mall_id, category_id, name, description, logo_url, cover_url,
         address, latitude, longitude, phone, website, whatsapp, instagram)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $user['id'],
    $_POST['mall_id'] ?? null,
    $_POST['category_id'] ?? null,
    $_POST['name'],
    $_POST['description'] ?? null,
    $logoUrl,
    $coverUrl,
    $_POST['address'] ?? null,
    $_POST['latitude'] ?? null,
    $_POST['longitude'] ?? null,
    $_POST['phone'] ?? null,
    $_POST['website'] ?? null,
    $_POST['whatsapp'] ?? null,
    $_POST['instagram'] ?? null,
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => 'pending'], 201);
