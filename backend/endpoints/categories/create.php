<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['super_admin']);
require_fields($_POST, ['name', 'area']);

$logoUrl = save_upload('logo', 'categories', UPLOAD_LOGO_MAX_DIMENSION);
$emailDomain = empty($_POST['email_domain']) ? null : strtolower(ltrim(trim($_POST['email_domain']), '@'));

$pdo = sehy_db();
$stmt = $pdo->prepare(
    'INSERT INTO categories (name, description, address, area, email_domain, logo_url) VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $_POST['name'],
    $_POST['description'] ?? null,
    $_POST['address'] ?? null,
    $_POST['area'],
    $emailDomain,
    $logoUrl,
]);

$newCategoryId = (int) $pdo->lastInsertId();
log_admin_action($user, 'category.create', 'category', $newCategoryId, ['name' => $_POST['name'], 'area' => $_POST['area']]);

json_ok(['id' => $newCategoryId], 201);
