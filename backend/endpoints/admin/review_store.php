<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin', 'mall_manager', 'store_owner']);

$data = body();
require_fields($data, ['id', 'status']);

$allowedStatuses = $user['role'] === 'store_owner'
    ? ['approved', 'rejected'] // suspending is a mall/admin-level action, not self-service
    : ['approved', 'rejected', 'suspended'];
if (!in_array($data['status'], $allowedStatuses, true)) {
    json_error('status must be ' . implode(' or ', $allowedStatuses), 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting a store', 422);
}

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT mall_id, owner_id, last_edited_by FROM stores WHERE id = ?');
$stmt->execute([$data['id']]);
$store = $stmt->fetch();
if (!$store) {
    json_error('Store not found', 404);
}

// A mall manager may only approve/reject stores inside their own mall.
if ($user['role'] === 'mall_manager') {
    if ($user['mall_id'] === null || (int) $store['mall_id'] !== (int) $user['mall_id']) {
        json_error('Forbidden: this store is not in your mall', 403);
    }
}

// A store manager (store_owner) may approve a pending edit to their own
// store — but only when their own store_staff made that edit, never when
// they submitted it themselves. That keeps the "never approve your own
// submission" rule intact while letting a manager review their staff's work.
if ($user['role'] === 'store_owner') {
    $isOwnStore = (int) $store['owner_id'] === (int) $user['id'];
    $editedBySomeoneElse = $store['last_edited_by'] !== null
        && (int) $store['last_edited_by'] !== (int) $user['id'];
    if (!$isOwnStore || !$editedBySomeoneElse) {
        json_error('Forbidden: you can only approve edits your own staff submitted', 403);
    }
}

// A store manager's approval publishes immediately — no separate admin
// sign-off step. (This branch only runs for staff-edited stores; see the
// self-approval check above, so every store_owner approval here is
// inherently staff-originated.)
$writeStatus = $data['status'];

// Cleared on approval so an old rejection reason doesn't linger and confuse
// a future re-review.
$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE stores SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A store owner's account is inactive (can't sign in) from registration
// until their first store is approved — activate it here, whoever approved
// it (admin, mall manager, or the store owner reviewing their own staff's
// edit). No-op for accounts already active. Same for store_staff.
if ($writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1
         WHERE id = (SELECT owner_id FROM stores WHERE id = ?) AND role = 'store_owner'"
    )->execute([$data['id']]);
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE store_id = ? AND role = 'store_staff'"
    )->execute([$data['id']]);
}

if (is_admin($user)) {
    log_admin_action($user, 'store.review', 'store', $data['id'], ['status' => $writeStatus]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
