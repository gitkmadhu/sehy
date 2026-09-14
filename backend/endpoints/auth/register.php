<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$data = body();
require_fields($data, ['name', 'email', 'password', 'phone']);

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
if ($stmt->fetch()) {
    json_error('An account with this email already exists', 409);
}

$requestedRole = $data['role'] ?? 'shopper';
$validRoles = ['shopper', 'store_owner', 'mall_manager', 'mall_staff', 'store_staff'];
$role = in_array($requestedRole, $validRoles, true) ? $requestedRole : 'shopper';

$mallId = null;
$storeId = null;
$mall = null;
$store = null;
$isActive = 1;
// Store owners, mall staff, and store staff get a session token immediately
// so they can submit their first store/ad/offer in this sitting, even
// though their account stays inactive (can't log back in later) until that
// first submission is approved. Mall managers are the exception: they must
// wait for admin approval before ever signing in.
$issueTokenNow = true;

if ($role === 'store_owner' || $role === 'mall_staff' || $role === 'store_staff') {
    $isActive = 0;
}

if ($role !== 'shopper') {
    $genericEmailDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
        'aol.com', 'protonmail.com', 'live.com', 'rediffmail.com',
    ];
    $emailDomain = strtolower(substr(strrchr($data['email'], '@'), 1) ?: '');
    if (in_array($emailDomain, $genericEmailDomains, true)) {
        json_error('Please sign up with your shop/business email address, not a generic provider like Gmail or Yahoo.', 422);
    }
}

// Mall managers and mall staff both represent a specific mall, and both must
// sign up with that mall's official email domain.
if ($role === 'mall_manager' || $role === 'mall_staff') {
    require_fields($data, ['mall_id']);

    $stmt = $pdo->prepare('SELECT id, name, email_domain FROM malls WHERE id = ?');
    $stmt->execute([$data['mall_id']]);
    $mall = $stmt->fetch();

    if (!$mall) {
        json_error('Selected mall not found', 404);
    }
    if (!$mall['email_domain']) {
        json_error('This mall has not configured an official email domain yet. Contact the admin.', 422);
    }

    $domain = strtolower(ltrim($mall['email_domain'], '@'));
    $emailDomain = strtolower(substr(strrchr($data['email'], '@'), 1) ?: '');
    if ($emailDomain !== $domain) {
        json_error("Please sign up using your official mall email address (must end with @{$domain})", 422);
    }

    $mallId = (int) $mall['id'];
}

// Store staff represent one specific store — e.g. the on-site H&M staff
// member, distinct from that store's manager (owner) account. Not tied to a
// mall directly; they just need to pick an already-approved store.
if ($role === 'store_staff') {
    require_fields($data, ['store_id']);

    $stmt = $pdo->prepare("SELECT id, name FROM stores WHERE id = ? AND status = 'approved'");
    $stmt->execute([$data['store_id']]);
    $store = $stmt->fetch();

    if (!$store) {
        json_error('Selected store not found', 404);
    }

    $storeId = (int) $store['id'];
}

if ($role === 'mall_manager') {
    $isActive = 0; // pending admin approval
    $issueTokenNow = false; // must wait for admin approval before ever signing in
}

$stmt = $pdo->prepare(
    'INSERT INTO users (name, email, password_hash, phone, role, mall_id, store_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $data['name'],
    $data['email'],
    password_hash($data['password'], PASSWORD_BCRYPT),
    $data['phone'] ?? null,
    $role,
    $mallId,
    $storeId,
    $isActive,
]);

$userId = (int) $pdo->lastInsertId();

record_incident('new_member', 'info', [
    'user_id' => $userId,
    'email' => $data['email'],
    'role' => $role,
    'mall_name' => $mall['name'] ?? null,
    'store_name' => $store['name'] ?? null,
]);

if (!$issueTokenNow) {
    json_ok(['pending' => true, 'message' => 'Your account has been submitted for admin approval.'], 201);
}

$token = issue_token($userId);

json_ok(['token' => $token, 'user' => [
    'id' => $userId,
    'name' => $data['name'],
    'email' => $data['email'],
    'role' => $role,
    'is_active' => $isActive,
    'mall_name' => $mall['name'] ?? null,
    'store_name' => $store['name'] ?? null,
]], 201);
