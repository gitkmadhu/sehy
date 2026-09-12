<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['store_owner', 'mall_manager', 'admin']);

require_fields($_POST, ['name']);

// Mall managers can only ever create stores inside their own mall — force it
// server-side rather than trusting whatever mall_id the client sends. Since
// they already have approval authority over their own mall (see
// admin/review_store.php), a store they create is approved immediately
// instead of sitting in a pending queue they'd just approve themselves.
$mallId = $_POST['mall_id'] ?? null;
$status = 'pending';
if ($user['role'] === 'mall_manager') {
    if ($user['mall_id'] === null) {
        json_error('Your account is not linked to a mall yet. Contact the admin.', 422);
    }
    $mallId = $user['mall_id'];
    $status = 'approved';
}

$pdo = gmls_db();

// A store_owner's very first store requires the one-time listing fee to have
// already been paid (backend/endpoints/payments). Later stores from the same
// owner don't need to pay again — mall_manager/admin-created stores are
// exempt entirely (they already hold approval authority, per above).
if ($user['role'] === 'store_owner') {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM stores WHERE owner_id = ?');
    $stmt->execute([$user['id']]);
    $hasExistingStore = (int) $stmt->fetchColumn() > 0;

    if (!$hasExistingStore) {
        $stmt = $pdo->prepare(
            "SELECT id FROM payments
             WHERE user_id = ? AND purpose = 'store_listing' AND status = 'paid' AND fulfilled_at IS NULL
             ORDER BY created_at ASC LIMIT 1"
        );
        $stmt->execute([$user['id']]);
        $payment = $stmt->fetch();
        if (!$payment) {
            json_error('Please pay the one-time listing fee before adding your first store.', 402);
        }
        // Atomically claim it so a concurrent request can't spend the same
        // payment on two different stores.
        $claim = $pdo->prepare('UPDATE payments SET fulfilled_at = NOW() WHERE id = ? AND fulfilled_at IS NULL');
        $claim->execute([$payment['id']]);
        if ($claim->rowCount() === 0) {
            json_error('Please pay the one-time listing fee before adding your first store.', 402);
        }
    }
}
$logoUrl = save_upload('logo', 'stores', UPLOAD_LOGO_MAX_DIMENSION);
$coverUrl = save_upload('cover', 'stores');

$stmt = $pdo->prepare(
    'INSERT INTO stores
        (owner_id, mall_id, city, category_id, name, description, logo_url, cover_url,
         address, latitude, longitude, phone, website, whatsapp,
         instagram_channel_url, youtube_channel_url, facebook_channel_url, twitter_channel_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $user['id'],
    $mallId,
    $_POST['city'] ?? null,
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
    $_POST['instagram_channel_url'] ?? null,
    $_POST['youtube_channel_url'] ?? null,
    $_POST['facebook_channel_url'] ?? null,
    $_POST['twitter_channel_url'] ?? null,
    $status,
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => $status], 201);
