<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['category_staff', 'category_manager', 'admin']);
require_fields($_POST, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM category_ads WHERE id = ?');
$stmt->execute([$_POST['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canEdit = is_admin($user)
    || ($user['role'] === 'category_staff' && (int) $ad['uploaded_by'] === (int) $user['id'])
    || ($user['role'] === 'category_manager' && $user['category_id'] !== null && (int) $ad['category_id'] === (int) $user['category_id']);

if (!$canEdit) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];

$imageUrl = save_upload('image', 'category_ads');
if ($imageUrl) {
    $fields[] = 'image_url = ?';
    $params[] = $imageUrl;
}
if (isset($_POST['link_url'])) {
    $fields[] = 'link_url = ?';
    $params[] = $_POST['link_url'];
}

// A category manager (or admin/super_admin) already holds approval authority,
// so their edit publishes immediately; a category staff edit goes back to
// pending for re-approval — same reasoning as services/update.php.
$fields[] = 'status = ?';
$params[] = ($user['role'] === 'category_manager' || is_admin($user)) ? 'approved' : 'pending';
$fields[] = 'edited_at = NOW()';

$params[] = $ad['id'];
$pdo->prepare('UPDATE category_ads SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

if (is_admin($user)) {
    log_admin_action($user, 'category_ad.update', 'category_ad', $ad['id'], ['fields' => array_keys($_POST)]);
}

json_ok(['id' => (int) $ad['id']]);
