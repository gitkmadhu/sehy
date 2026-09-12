<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['mall_staff', 'mall_manager']);

if ($user['mall_id'] === null) {
    json_error('Your account is not linked to a mall yet. Contact the admin.', 422);
}

$imageUrl = save_upload('image', 'mall_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

// No manager-approval step for mall banners — a mall_manager and their
// mall_staff each publish independently on their own mall (same as a
// store_owner/store_staff pair does for store_ads), gated only by the
// active-subscription check below. mall_ads/review.php still exists and
// still works (e.g. an admin taking a live banner down) — it's just never
// reached from this endpoint anymore, since nothing lands 'pending' here.
$status = 'approved';

$pdo = gmls_db();

// Ad uploads require an active subscription window (Monthly/Quarterly/
// Half-Yearly/Yearly, purchased via payments/create_order.php or granted by
// an admin — see malls/update.php). Applies identically to the manager and
// their staff. Compared entirely in SQL (NOW()) rather than PHP's
// strtotime()/time(), since Apache's PHP timezone and MySQL's do not match
// on this deployment.
$stmt = $pdo->prepare(
    'SELECT (subscription_expires_at IS NOT NULL AND subscription_expires_at >= NOW()) AS is_active FROM malls WHERE id = ?'
);
$stmt->execute([$user['mall_id']]);
if (!$stmt->fetchColumn()) {
    json_error("Your mall's ad subscription has expired. Ask your mall manager to renew.", 402);
}

$stmt = $pdo->prepare(
    'INSERT INTO mall_ads (mall_id, uploaded_by, image_url, link_url, status)
     VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
    $user['mall_id'],
    $user['id'],
    $imageUrl,
    $_POST['link_url'] ?? null,
    $status,
]);
$adId = (int) $pdo->lastInsertId();

// Staff-submitted ads need the manager's review — alert them via the app's
// in-app notification inbox (see user_notifications/*.php) so they don't
// have to keep checking the dashboard manually. A manager's own upload
// (status already 'approved' above) needs no such alert.
if ($status === 'pending') {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE mall_id = ? AND role = 'mall_manager' LIMIT 1");
    $stmt->execute([$user['mall_id']]);
    $managerId = $stmt->fetchColumn();
    if ($managerId) {
        $pdo->prepare(
            'INSERT INTO user_notifications (user_id, type, title, body, data)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $managerId,
            'mall_ad_pending',
            'New banner request',
            "{$user['name']} submitted a banner for {$user['mall_name']}",
            json_encode(['mall_ad_id' => $adId]),
        ]);
    }
}

json_ok(['id' => $adId, 'status' => $status], 201);
