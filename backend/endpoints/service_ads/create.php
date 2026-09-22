<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['service_staff', 'service_owner']);

$pdo = sehy_db();

if ($user['role'] === 'service_staff') {
    if ($user['service_id'] === null) {
        json_error('Your account is not linked to a service yet. Contact your service manager.', 422);
    }
    $serviceId = (int) $user['service_id'];
} else {
    require_fields($_POST, ['service_id']);
    $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
    $stmt->execute([$_POST['service_id']]);
    $service = $stmt->fetch();
    if (!$service || !can_manage_service($user, $service)) {
        json_error('Forbidden: you do not manage this service', 403);
    }
    $serviceId = (int) $service['id'];
}

$imageUrl = save_upload('image', 'service_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

// A service manager already holds approval authority over their own service, so
// an ad they upload themselves publishes immediately instead of sitting in a
// pending queue they'd just approve themselves — same reasoning as
// category_manager-uploaded category ads in category_ads/create.php.
$status = $user['role'] === 'service_owner' ? 'approved' : 'pending';

// Every ad upload — by the manager or their staff — spends one purchased
// credit. Guarded by ad_credits > 0 so concurrent uploads can't go negative.
$spend = $pdo->prepare('UPDATE services SET ad_credits = ad_credits - 1 WHERE id = ? AND ad_credits > 0');
$spend->execute([$serviceId]);
if ($spend->rowCount() === 0) {
    json_error('No ad credits remaining. Ask your service manager to purchase more.', 402);
}

$stmt = $pdo->prepare(
    'INSERT INTO service_ads (service_id, uploaded_by, image_url, link_url, product_name, brand_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $serviceId,
    $user['id'],
    $imageUrl,
    $_POST['link_url'] ?? null,
    trim($_POST['product_name'] ?? '') ?: null,
    trim($_POST['brand_name'] ?? '') ?: null,
    $status,
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => $status], 201);
