<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['super_admin']);
require_fields($_POST, ['name', 'city']);

$logoUrl = save_upload('logo', 'malls', UPLOAD_LOGO_MAX_DIMENSION);
$emailDomain = empty($_POST['email_domain']) ? null : strtolower(ltrim(trim($_POST['email_domain']), '@'));

$pdo = gmls_db();
$stmt = $pdo->prepare(
    'INSERT INTO malls (name, description, address, city, email_domain, logo_url) VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $_POST['name'],
    $_POST['description'] ?? null,
    $_POST['address'] ?? null,
    $_POST['city'],
    $emailDomain,
    $logoUrl,
]);

json_ok(['id' => (int) $pdo->lastInsertId()], 201);
