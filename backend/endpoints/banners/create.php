<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['admin']);

$imageUrl = save_upload('image', 'banners');
if (!$imageUrl) {
    json_error('Missing required field: image', 422);
}

$linkUrl = $_POST['link_url'] ?? null;

// Empty/absent start_at means "active immediately" — deliberately not
// resolved to a NOW() string here (client/server clock skew); NULL is
// simply excluded from the window check in banners/list.php.
$startAt = !empty($_POST['start_at']) ? $_POST['start_at'] : null;
$endAt = !empty($_POST['end_at']) ? $_POST['end_at'] : null;
if ($startAt !== null && strtotime($startAt) === false) {
    json_error('Invalid start_at', 422);
}
if ($endAt !== null && strtotime($endAt) === false) {
    json_error('Invalid end_at', 422);
}
if ($startAt !== null && $endAt !== null && strtotime($endAt) <= strtotime($startAt)) {
    json_error('end_at must be after start_at', 422);
}

$pdo = sehy_db();
$pdo->prepare('INSERT INTO banners (image_url, link_url, start_at, end_at) VALUES (?, ?, ?, ?)')
    ->execute([$imageUrl, $linkUrl, $startAt, $endAt]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'image_url' => $imageUrl, 'link_url' => $linkUrl], 201);
