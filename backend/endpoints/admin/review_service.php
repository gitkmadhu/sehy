<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin', 'category_manager', 'service_owner']);

$data = body();
require_fields($data, ['id', 'status']);

$allowedStatuses = $user['role'] === 'service_owner'
    ? ['approved', 'rejected'] // suspending is a category/admin-level action, not self-service
    : ['approved', 'rejected', 'suspended'];
if (!in_array($data['status'], $allowedStatuses, true)) {
    json_error('status must be ' . implode(' or ', $allowedStatuses), 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting a service', 422);
}

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT category_id, owner_id, last_edited_by FROM services WHERE id = ?');
$stmt->execute([$data['id']]);
$service = $stmt->fetch();
if (!$service) {
    json_error('Service not found', 404);
}

// A category manager may only approve/reject services inside their own category.
if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null || (int) $service['category_id'] !== (int) $user['category_id']) {
        json_error('Forbidden: this service is not in your category', 403);
    }
}

// A service manager (service_owner) may approve a pending edit to their own
// service — but only when their own service_staff made that edit, never when
// they submitted it themselves. That keeps the "never approve your own
// submission" rule intact while letting a manager review their staff's work.
if ($user['role'] === 'service_owner') {
    $isOwnService = (int) $service['owner_id'] === (int) $user['id'];
    $editedBySomeoneElse = $service['last_edited_by'] !== null
        && (int) $service['last_edited_by'] !== (int) $user['id'];
    if (!$isOwnService || !$editedBySomeoneElse) {
        json_error('Forbidden: you can only approve edits your own staff submitted', 403);
    }
}

// A service manager's approval publishes immediately — no separate admin
// sign-off step. (This branch only runs for staff-edited services; see the
// self-approval check above, so every service_owner approval here is
// inherently staff-originated.)
$writeStatus = $data['status'];

// Cleared on approval so an old rejection reason doesn't linger and confuse
// a future re-review.
$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE services SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A service owner's account is inactive (can't sign in) from registration
// until their first service is approved — activate it here, whoever approved
// it (admin, category manager, or the service owner reviewing their own staff's
// edit). No-op for accounts already active. Same for service_staff.
if ($writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1
         WHERE id = (SELECT owner_id FROM services WHERE id = ?) AND role = 'service_owner'"
    )->execute([$data['id']]);
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE service_id = ? AND role = 'service_staff'"
    )->execute([$data['id']]);
}

if (is_admin($user)) {
    log_admin_action($user, 'service.review', 'service', $data['id'], ['status' => $writeStatus]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
