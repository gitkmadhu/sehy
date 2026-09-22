<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['service_owner', 'admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting an ad', 422);
}

$pdo = sehy_db();

$stmt = $pdo->prepare(
    'SELECT a.service_id, a.uploaded_by, s.owner_id FROM service_ads a JOIN services s ON s.id = a.service_id WHERE a.id = ?'
);
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

// A service manager may only review ads for their own service. Admin has no such
// scoping — they're the final sign-off for any service.
if ($user['role'] === 'service_owner') {
    if ((int) $ad['owner_id'] !== (int) $user['id']) {
        json_error('Forbidden: this ad is not for your service', 403);
    }
}

// A service manager's "approve" doesn't go live yet — an app admin still has to
// give final sign-off. (A manager's own direct upload never reaches this
// endpoint — it auto-publishes at creation instead — so every service_owner
// approval here is inherently staff-originated.) Admin approving publishes
// immediately.
$writeStatus = ($user['role'] === 'service_owner' && $data['status'] === 'approved')
    ? 'manager_approved'
    : $data['status'];

$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE service_ads SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A service staff account is inactive from registration until their first
// submission is approved by the service manager — activate it here too (an ad
// approval counts, same as a service-profile-edit approval). No-op for
// accounts already active.
if ($writeStatus === 'manager_approved' || $writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE id = ? AND role = 'service_staff'"
    )->execute([$ad['uploaded_by']]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
