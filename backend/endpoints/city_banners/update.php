<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['admin']);
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT id FROM city_banners WHERE id = ?');
$stmt->execute([$_POST['id']]);
if (!$stmt->fetch()) {
    json_error('City banner not found', 404);
}

$fields = [];
$params = [];

if (isset($_POST['city']) && $_POST['city'] !== '') {
    $fields[] = 'city = ?';
    $params[] = $_POST['city'];
}

if (isset($_POST['link_url'])) {
    $fields[] = 'link_url = ?';
    $params[] = $_POST['link_url'] === '' ? null : $_POST['link_url'];
}

if (!empty($_POST['clear_start'])) {
    $fields[] = 'start_at = NULL';
} elseif (!empty($_POST['start_at'])) {
    if (strtotime($_POST['start_at']) === false) {
        json_error('Invalid start_at', 422);
    }
    $fields[] = 'start_at = ?';
    $params[] = $_POST['start_at'];
}

if (!empty($_POST['clear_end'])) {
    $fields[] = 'end_at = NULL';
} elseif (!empty($_POST['end_at'])) {
    if (strtotime($_POST['end_at']) === false) {
        json_error('Invalid end_at', 422);
    }
    $fields[] = 'end_at = ?';
    $params[] = $_POST['end_at'];
}

$imageUrl = save_upload('image', 'city_banners');
if ($imageUrl) {
    $fields[] = 'image_url = ?';
    $params[] = $imageUrl;
}

if ($fields) {
    $params[] = $_POST['id'];
    $pdo->prepare('UPDATE city_banners SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
}

json_ok(['id' => (int) $_POST['id']]);
