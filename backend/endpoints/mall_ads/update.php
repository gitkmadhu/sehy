<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['mall_staff', 'mall_manager', 'super_admin']);
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM mall_ads WHERE id = ?');
$stmt->execute([$_POST['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

$canEdit = is_super_admin($user)
    || ($user['role'] === 'mall_staff' && (int) $ad['uploaded_by'] === (int) $user['id'])
    || ($user['role'] === 'mall_manager' && $user['mall_id'] !== null && (int) $ad['mall_id'] === (int) $user['mall_id']);

if (!$canEdit) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];

$imageUrl = save_upload('image', 'mall_ads');
if ($imageUrl) {
    $fields[] = 'image_url = ?';
    $params[] = $imageUrl;
}
if (isset($_POST['link_url'])) {
    $fields[] = 'link_url = ?';
    $params[] = $_POST['link_url'];
}

// A mall manager (or super_admin) already holds approval authority, so
// their edit publishes immediately; a mall staff edit goes back to pending
// for re-approval — same reasoning as stores/update.php.
$fields[] = 'status = ?';
$params[] = ($user['role'] === 'mall_manager' || is_super_admin($user)) ? 'approved' : 'pending';
$fields[] = 'edited_at = NOW()';

$params[] = $ad['id'];
$pdo->prepare('UPDATE mall_ads SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

if (is_super_admin($user)) {
    log_admin_action($user, 'mall_ad.update', 'mall_ad', $ad['id'], ['fields' => array_keys($_POST)]);
}

json_ok(['id' => (int) $ad['id']]);
