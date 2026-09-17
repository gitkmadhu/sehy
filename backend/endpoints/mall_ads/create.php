<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['mall_staff', 'mall_manager', 'admin']);

$pdo = gmls_db();

// An admin/super_admin publishes directly for any mall (picked explicitly,
// since they have no mall_id of their own) and skips the subscription-
// active gate below — same reasoning as admin-created stores skipping the
// listing fee in stores/create.php.
if (is_admin($user)) {
    require_fields($_POST, ['mall_id']);
    $stmt = $pdo->prepare('SELECT id FROM malls WHERE id = ?');
    $stmt->execute([$_POST['mall_id']]);
    if (!$stmt->fetch()) {
        json_error('Mall not found', 404);
    }
    $mallId = (int) $_POST['mall_id'];
} else {
    if ($user['mall_id'] === null) {
        json_error('Your account is not linked to a mall yet. Contact the admin.', 422);
    }
    $mallId = $user['mall_id'];
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

// Ad uploads require an active subscription window (Monthly/Quarterly/
// Half-Yearly/Yearly, purchased via payments/create_order.php or granted by
// an admin — see malls/update.php). Applies identically to the manager and
// their staff. Compared entirely in SQL (NOW()) rather than PHP's
// strtotime()/time(), since Apache's PHP timezone and MySQL's do not match
// on this deployment. An admin/super_admin publishing directly skips this —
// same as the subscription itself being something only they can grant.
if (!is_admin($user)) {
    $stmt = $pdo->prepare(
        'SELECT (subscription_expires_at IS NOT NULL AND subscription_expires_at >= NOW()) AS is_active FROM malls WHERE id = ?'
    );
    $stmt->execute([$mallId]);
    if (!$stmt->fetchColumn()) {
        json_error("Your mall's ad subscription has expired. Ask your mall manager to renew.", 402);
    }
}

$stmt = $pdo->prepare(
    'INSERT INTO mall_ads (mall_id, uploaded_by, image_url, link_url, status)
     VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
    $mallId,
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
    $stmt->execute([$mallId]);
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

if (is_admin($user)) {
    log_admin_action($user, 'mall_ad.create', 'mall_ad', $adId, ['mall_id' => $mallId]);
}

json_ok(['id' => $adId, 'status' => $status], 201);
