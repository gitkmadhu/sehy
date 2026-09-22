<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['service_owner', 'category_manager', 'service_staff', 'admin']);
require_fields($_POST, ['service_id', 'title', 'expires_at']);

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
$stmt->execute([$_POST['service_id']]);
$service = $stmt->fetch();

if (!$service) {
    json_error('Service not found', 404);
}
if (!can_manage_service($user, $service)) {
    json_error('Forbidden: you do not manage this service', 403);
}

$imageUrl = save_upload('image', 'offers');

$stmt = $pdo->prepare(
    'INSERT INTO offers
        (service_id, tag_id, title, description, image_url,
         original_price, discounted_price, discount_percent, starts_at, expires_at, submitted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $service['id'],
    $_POST['tag_id'] ?? $service['tag_id'],
    $_POST['title'],
    $_POST['description'] ?? null,
    $imageUrl,
    $_POST['original_price'] ?? null,
    $_POST['discounted_price'] ?? null,
    $_POST['discount_percent'] ?? null,
    $_POST['starts_at'] ?? null,
    $_POST['expires_at'],
    $user['id'],
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => 'pending'], 201);
