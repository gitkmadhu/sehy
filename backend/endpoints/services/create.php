<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';
require_once __DIR__ . '/../../lib/kyc.php';

$user = current_user();
require_role($user, ['service_owner', 'category_manager', 'super_admin']);

require_fields($_POST, ['name', 'email']);
if (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
    json_error('Enter a valid contact email', 422);
}

// Category managers can only ever create services inside their own category — force it
// server-side rather than trusting whatever category_id the client sends. Since
// they already have approval authority over their own category (see
// admin/review_service.php), a service they create is approved immediately
// instead of sitting in a pending queue they'd just approve themselves.
$categoryId = $_POST['category_id'] ?? null;
$status = 'pending';
if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null) {
        json_error('Your account is not linked to a category yet. Contact the admin.', 422);
    }
    $categoryId = $user['category_id'];
    $status = 'approved';
}

$pdo = sehy_db();

// A service_owner's very first service requires the one-time listing fee to have
// already been paid (backend/endpoints/payments). Later services from the same
// owner don't need to pay again — category_manager/super_admin-created services are
// exempt entirely (they already hold approval authority, per above).
if ($user['role'] === 'service_owner') {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM services WHERE owner_id = ?');
    $stmt->execute([$user['id']]);
    $hasExistingService = (int) $stmt->fetchColumn() > 0;

    if (!$hasExistingService) {
        $stmt = $pdo->prepare(
            "SELECT id FROM payments
             WHERE user_id = ? AND purpose = 'service_listing' AND status = 'paid' AND fulfilled_at IS NULL
             ORDER BY created_at ASC LIMIT 1"
        );
        $stmt->execute([$user['id']]);
        $payment = $stmt->fetch();
        if (!$payment) {
            json_error('Please pay the one-time listing fee before adding your first service.', 402);
        }
        // Atomically claim it so a concurrent request can't spend the same
        // payment on two different services.
        $claim = $pdo->prepare('UPDATE payments SET fulfilled_at = NOW() WHERE id = ? AND fulfilled_at IS NULL');
        $claim->execute([$payment['id']]);
        if ($claim->rowCount() === 0) {
            json_error('Please pay the one-time listing fee before adding your first service.', 402);
        }
    }
}

// KYC is required for a service_owner's own submission only — a
// category_manager/super_admin-created service already carries that authority,
// same reasoning as the listing-fee exemption above.
$gstin = null;
$pan = null;
$allocationProofUrl = null;
if ($user['role'] === 'service_owner') {
    ['gstin' => $gstin, 'pan' => $pan] = require_gstin_or_pan($_POST);
    $allocationProofUrl = save_document_upload('allocation_proof', 'services');
    if (!$allocationProofUrl) {
        json_error('Please upload proof that this service is allocated space in the category (image or PDF).', 422);
    }
}

$logoUrl = save_upload('logo', 'services', UPLOAD_LOGO_MAX_DIMENSION);
if (!$logoUrl) {
    json_error('Please upload a service image/logo.', 422);
}
$coverUrl = save_upload('cover', 'services');

$stmt = $pdo->prepare(
    'INSERT INTO services
        (owner_id, category_id, area, tag_id, name, description, logo_url, cover_url,
         gstin, pan, allocation_proof_url,
         address, latitude, longitude, phone, website, email, floor_unit, opening_hours, tagline, whatsapp,
         instagram_channel_url, youtube_channel_url, facebook_channel_url, twitter_channel_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $user['id'],
    $categoryId,
    $_POST['area'] ?? null,
    $_POST['tag_id'] ?? null,
    $_POST['name'],
    $_POST['description'] ?? null,
    $logoUrl,
    $coverUrl,
    $gstin,
    $pan,
    $allocationProofUrl,
    $_POST['address'] ?? null,
    $_POST['latitude'] ?? null,
    $_POST['longitude'] ?? null,
    $_POST['phone'] ?? null,
    $_POST['website'] ?? null,
    $_POST['email'],
    $_POST['floor_unit'] ?? null,
    $_POST['opening_hours'] ?? null,
    $_POST['tagline'] ?? null,
    $_POST['whatsapp'] ?? null,
    $_POST['instagram_channel_url'] ?? null,
    $_POST['youtube_channel_url'] ?? null,
    $_POST['facebook_channel_url'] ?? null,
    $_POST['twitter_channel_url'] ?? null,
    $status,
]);

json_ok(['id' => (int) $pdo->lastInsertId(), 'status' => $status], 201);
