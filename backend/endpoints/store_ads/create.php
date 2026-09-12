<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['store_staff', 'store_owner']);

$pdo = gmls_db();

if ($user['role'] === 'store_staff') {
    if ($user['store_id'] === null) {
        json_error('Your account is not linked to a store yet. Contact your store manager.', 422);
    }
    $storeId = (int) $user['store_id'];
} else {
    require_fields($_POST, ['store_id']);
    $stmt = $pdo->prepare('SELECT * FROM stores WHERE id = ?');
    $stmt->execute([$_POST['store_id']]);
    $store = $stmt->fetch();
    if (!$store || !can_manage_store($user, $store)) {
        json_error('Forbidden: you do not manage this store', 403);
    }
    $storeId = (int) $store['id'];
}

$imageUrl = save_upload('image', 'store_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

// A store manager already holds approval authority over their own store, so
// an ad they upload themselves publishes immediately instead of sitting in a
// pending queue they'd just approve themselves — same reasoning as
// mall_manager-uploaded mall ads in mall_ads/create.php.
$status = $user['role'] === 'store_owner' ? 'approved' : 'pending';

// Every ad upload — by the manager or their staff — spends one purchased
// credit. Guarded by ad_credits > 0 so concurrent uploads can't go negative.
$spend = $pdo->prepare('UPDATE stores SET ad_credits = ad_credits - 1 WHERE id = ? AND ad_credits > 0');
$spend->execute([$storeId]);
if ($spend->rowCount() === 0) {
    json_error('No ad credits remaining. Ask your store manager to purchase more.', 402);
}

$stmt = $pdo->prepare(
    'INSERT INTO store_ads (store_id, uploaded_by, image_url, link_url, product_name, brand_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $storeId,
    $user['id'],
    $imageUrl,
    $_POST['link_url'] ?? null,
    trim($_POST['product_name'] ?? '') ?: null,
    trim($_POST['brand_name'] ?? '') ?: null,
    $status,
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => $status], 201);
