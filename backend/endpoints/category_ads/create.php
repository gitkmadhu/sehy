<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['category_staff', 'category_manager', 'admin']);

$pdo = sehy_db();

// An admin/super_admin publishes directly for any category (picked explicitly,
// since they have no category_id of their own) and skips the subscription-
// active gate below — same reasoning as admin-created services skipping the
// listing fee in services/create.php.
if (is_admin($user)) {
    require_fields($_POST, ['category_id']);
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $stmt->execute([$_POST['category_id']]);
    if (!$stmt->fetch()) {
        json_error('Category not found', 404);
    }
    $categoryId = (int) $_POST['category_id'];
} else {
    if ($user['category_id'] === null) {
        json_error('Your account is not linked to a category yet. Contact the admin.', 422);
    }
    $categoryId = $user['category_id'];
}

$imageUrl = save_upload('image', 'category_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

// No manager-approval step for category banners — a category_manager and their
// category_staff each publish independently on their own category (same as a
// service_owner/service_staff pair does for service_ads), gated only by the
// active-subscription check below. category_ads/review.php still exists and
// still works (e.g. an admin taking a live banner down) — it's just never
// reached from this endpoint anymore, since nothing lands 'pending' here.
$status = 'approved';

// Ad uploads require an active subscription window (Monthly/Quarterly/
// Half-Yearly/Yearly, purchased via payments/create_order.php or granted by
// an admin — see categories/update.php). Applies identically to the manager and
// their staff. Compared entirely in SQL (NOW()) rather than PHP's
// strtotime()/time(), since Apache's PHP timezone and MySQL's do not match
// on this deployment. An admin/super_admin publishing directly skips this —
// same as the subscription itself being something only they can grant.
if (!is_admin($user)) {
    $stmt = $pdo->prepare(
        'SELECT (subscription_expires_at IS NOT NULL AND subscription_expires_at >= NOW()) AS is_active FROM categories WHERE id = ?'
    );
    $stmt->execute([$categoryId]);
    if (!$stmt->fetchColumn()) {
        json_error("Your category's ad subscription has expired. Ask your category manager to renew.", 402);
    }
}

$stmt = $pdo->prepare(
    'INSERT INTO category_ads (category_id, uploaded_by, image_url, link_url, status)
     VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([
    $categoryId,
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
    $stmt = $pdo->prepare("SELECT id FROM users WHERE category_id = ? AND role = 'category_manager' LIMIT 1");
    $stmt->execute([$categoryId]);
    $managerId = $stmt->fetchColumn();
    if ($managerId) {
        $pdo->prepare(
            'INSERT INTO user_notifications (user_id, type, title, body, data)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $managerId,
            'category_ad_pending',
            'New banner request',
            "{$user['name']} submitted a banner for {$user['category_name']}",
            json_encode(['category_ad_id' => $adId]),
        ]);
    }
}

if (is_admin($user)) {
    log_admin_action($user, 'category_ad.create', 'category_ad', $adId, ['category_id' => $categoryId]);
}

json_ok(['id' => $adId, 'status' => $status], 201);
