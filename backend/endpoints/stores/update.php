<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM stores WHERE id = ?');
$stmt->execute([$_POST['id']]);
$store = $stmt->fetch();

if (!$store) {
    json_error('Store not found', 404);
}
if ($store['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];
$editable = [
    'mall_id', 'category_id', 'name', 'description', 'address',
    'latitude', 'longitude', 'phone', 'website', 'whatsapp', 'instagram',
];
foreach ($editable as $field) {
    if (isset($_POST[$field])) {
        $fields[] = "{$field} = ?";
        $params[] = $_POST[$field];
    }
}

$logoUrl = save_upload('logo', 'stores');
if ($logoUrl) {
    $fields[] = 'logo_url = ?';
    $params[] = $logoUrl;
}
$coverUrl = save_upload('cover', 'stores');
if ($coverUrl) {
    $fields[] = 'cover_url = ?';
    $params[] = $coverUrl;
}

// Owners re-submitting an edited store go back to pending review.
if ($user['role'] !== 'admin') {
    $fields[] = "status = 'pending'";
}

if ($fields) {
    $params[] = $store['id'];
    $pdo->prepare('UPDATE stores SET ' . implode(', ', $fields) . ' WHERE id = ?')
        ->execute($params);
}

json_ok(['id' => (int) $store['id']]);
