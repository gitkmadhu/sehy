<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
// The category page's hero banner can be posted by the category's own team, and
// by the managers/staff of the units and services (sub-units) inside it — each
// after paying for their own banner window (see payments/create_order.php).
require_role($user, [
    'category_staff', 'category_manager', 'admin',
    'unit_manager', 'unit_staff', 'service_owner', 'service_staff',
]);

$pdo = sehy_db();

$unitId = null;
$serviceId = null;
$expiryTable = null; // [table, id] whose paid window gates this upload; null = admin
$expiryError = '';

if (is_admin($user)) {
    // An admin/super_admin publishes directly for any category (picked explicitly)
    // and skips the paid-window gate — same reasoning as admin-created services
    // skipping the listing fee in services/create.php.
    require_fields($_POST, ['category_id']);
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $stmt->execute([$_POST['category_id']]);
    if (!$stmt->fetch()) {
        json_error('Category not found', 404);
    }
    $categoryId = (int) $_POST['category_id'];
} elseif (in_array($user['role'], ['unit_manager', 'unit_staff'], true)) {
    if ($user['unit_id'] === null) {
        json_error('Your account is not linked to a unit yet. Contact the admin.', 422);
    }
    $stmt = $pdo->prepare('SELECT id, category_id FROM units WHERE id = ?');
    $stmt->execute([$user['unit_id']]);
    $unit = $stmt->fetch();
    if (!$unit) {
        json_error('Unit not found', 404);
    }
    $unitId = (int) $unit['id'];
    $categoryId = (int) $unit['category_id'];
    $expiryTable = ['units', $unitId];
    $expiryError = "Your unit's banner plan has expired. Ask your unit manager to renew it.";
} elseif (in_array($user['role'], ['service_owner', 'service_staff'], true)) {
    if ($user['role'] === 'service_staff') {
        if ($user['service_id'] === null) {
            json_error('Your account is not linked to a service yet. Contact your service manager.', 422);
        }
        $serviceIdRaw = $user['service_id'];
    } else {
        require_fields($_POST, ['service_id']);
        $serviceIdRaw = $_POST['service_id'];
    }
    $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
    $stmt->execute([$serviceIdRaw]);
    $service = $stmt->fetch();
    if (!$service || !can_manage_service($user, $service)) {
        json_error('Forbidden: you do not manage this service', 403);
    }
    if ($service['category_id'] === null) {
        json_error('This service is not in a category, so it has no category page to advertise on.', 422);
    }
    $serviceId = (int) $service['id'];
    $categoryId = (int) $service['category_id'];
    $expiryTable = ['services', $serviceId];
    $expiryError = "This service's banner plan has expired. Renew it to upload again.";
} else {
    if ($user['category_id'] === null) {
        json_error('Your account is not linked to a category yet. Contact the admin.', 422);
    }
    $categoryId = $user['category_id'];
    $expiryTable = ['categories', (int) $categoryId];
    $expiryError = "Your category's ad subscription has expired. Ask your category manager to renew.";
}

$link = normalize_banner_link($_POST['link_url'] ?? null);

$imageUrl = save_upload('image', 'category_ads');
if (!$imageUrl) {
    json_error('An image is required', 422);
}

// No manager-approval step for category-page banners — whoever is allowed to
// upload publishes straight away (gated only by the paid window below).
// category_ads/review.php still works, e.g. for an admin taking a live banner
// down; nothing lands 'pending' from this endpoint anymore.
$status = 'approved';

// Uploads require an active paid window (Weekly/Monthly/... plan bought via
// payments/create_order.php, or granted by an admin). Compared entirely in SQL
// (NOW()) rather than PHP time(), since Apache's PHP timezone and MySQL's do
// not match on this deployment.
if ($expiryTable !== null) {
    [$table, $id] = $expiryTable;
    $column = $table === 'categories' ? 'subscription_expires_at' : 'banner_subscription_expires_at';
    $stmt = $pdo->prepare("SELECT ({$column} IS NOT NULL AND {$column} >= NOW()) FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) {
        json_error($expiryError, 402);
    }
}

$stmt = $pdo->prepare(
    'INSERT INTO category_ads (category_id, unit_id, service_id, uploaded_by, image_url, link_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$categoryId, $unitId, $serviceId, $user['id'], $imageUrl, $link, $status]);
$adId = (int) $pdo->lastInsertId();

if (is_admin($user)) {
    log_admin_action($user, 'category_ad.create', 'category_ad', $adId, ['category_id' => $categoryId]);
}

json_ok(['id' => $adId, 'status' => $status], 201);
