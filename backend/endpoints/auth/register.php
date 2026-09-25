<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/kyc.php';

$data = body();
require_fields($data, ['name', 'email', 'password', 'phone']);

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
if ($stmt->fetch()) {
    json_error('An account with this email already exists', 409);
}

$requestedRole = $data['role'] ?? 'shopper';
$validRoles = ['shopper', 'service_owner', 'category_manager', 'category_staff', 'service_staff', 'unit_manager', 'unit_staff'];
$role = in_array($requestedRole, $validRoles, true) ? $requestedRole : 'shopper';

$categoryId = null;
$unitId = null;
$unit = null;
$serviceId = null;
$category = null;
$service = null;
$isActive = 1;
// Service owners, category staff, and service staff get a session token immediately
// so they can submit their first service/ad/offer in this sitting, even
// though their account stays inactive (can't log back in later) until that
// first submission is approved. Category managers are the exception: they must
// wait for admin approval before ever signing in.
$issueTokenNow = true;

if ($role === 'service_owner' || $role === 'category_staff' || $role === 'service_staff' || $role === 'unit_staff') {
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

// Category managers and category staff both represent a specific category, and both must
// sign up with that category's official email domain.
if ($role === 'category_manager' || $role === 'category_staff') {
    require_fields($data, ['category_id']);

    $stmt = $pdo->prepare('SELECT id, name, email_domain FROM categories WHERE id = ?');
    $stmt->execute([$data['category_id']]);
    $category = $stmt->fetch();

    if (!$category) {
        json_error('Selected category not found', 404);
    }
    if (!$category['email_domain']) {
        json_error('This category has not configured an official email domain yet. Contact the admin.', 422);
    }

    $domain = strtolower(ltrim($category['email_domain'], '@'));
    $emailDomain = strtolower(substr(strrchr($data['email'], '@'), 1) ?: '');
    if ($emailDomain !== $domain) {
        json_error("Please sign up using your official category email address (must end with @{$domain})", 422);
    }

    $categoryId = (int) $category['id'];
}

// A service_owner's category is optional at registration (not every service sits
// inside a category — see services/create.php's own optional category_id) and, unlike
// category_manager/category_staff above, doesn't gate on an email domain match —
// it's just a heads-up for admin, the real allocation-proof check happens
// at service-creation time.
if ($role === 'service_owner' && !empty($data['category_id'])) {
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $stmt->execute([$data['category_id']]);
    $category = $stmt->fetch();
    if (!$category) {
        json_error('Selected category not found', 404);
    }
    $categoryId = (int) $category['id'];
}

// GST/PAN of the category management entity — required only for category_manager
// (category_staff piggyback on their manager's already-reviewed category). Only
// fills them in if the category doesn't already have them, so a later
// registration for the same category can't silently overwrite a value admin
// already reviewed — admin can correct it directly if it's genuinely wrong.
if ($role === 'category_manager') {
    ['gstin' => $categoryGstin, 'pan' => $categoryPan] = require_gstin_or_pan($data);
    $pdo->prepare('UPDATE categories SET gstin = COALESCE(gstin, ?), pan = COALESCE(pan, ?) WHERE id = ?')
        ->execute([$categoryGstin, $categoryPan, $categoryId]);
}

// Unit managers and unit staff represent one specific unit. A manager waits
// for admin approval before signing in; staff get a token straight away so
// they can submit the unit's profile, and stay inactive until that first
// submission is signed off.
if ($role === 'unit_manager' || $role === 'unit_staff') {
    require_fields($data, ['unit_id']);
    $stmt = $pdo->prepare("SELECT id, name FROM units WHERE id = ?");
    $stmt->execute([$data['unit_id']]);
    $unit = $stmt->fetch();
    if (!$unit) {
        json_error('Selected unit not found', 404);
    }
    $unitId = (int) $unit['id'];
}

// Service staff represent one specific service — e.g. the on-site H&M staff
// member, distinct from that service's manager (owner) account. Not tied to a
// category directly; they just need to pick an already-approved service.
if ($role === 'service_staff') {
    require_fields($data, ['service_id']);

    $stmt = $pdo->prepare("SELECT id, name FROM services WHERE id = ? AND status = 'approved'");
    $stmt->execute([$data['service_id']]);
    $service = $stmt->fetch();

    if (!$service) {
        json_error('Selected service not found', 404);
    }

    $serviceId = (int) $service['id'];
}

if ($role === 'category_manager' || $role === 'unit_manager') {
    $isActive = 0; // pending admin approval
    $issueTokenNow = false; // must wait for admin approval before ever signing in
}

$stmt = $pdo->prepare(
    'INSERT INTO users (name, email, password_hash, phone, role, category_id, unit_id, service_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    $data['name'],
    $data['email'],
    password_hash($data['password'], PASSWORD_BCRYPT),
    $data['phone'] ?? null,
    $role,
    $categoryId,
    $unitId,
    $serviceId,
    $isActive,
]);

$userId = (int) $pdo->lastInsertId();

record_incident('new_member', 'info', [
    'user_id' => $userId,
    'email' => $data['email'],
    'role' => $role,
    'category_name' => $category['name'] ?? null,
    'unit_name' => $unit['name'] ?? null,
    'service_name' => $service['name'] ?? null,
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
    'category_name' => $category['name'] ?? null,
    'unit_name' => $unit['name'] ?? null,
    'service_name' => $service['name'] ?? null,
]], 201);
