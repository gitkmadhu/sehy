<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin', 'mall_manager']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting a mall profile edit', 422);
}

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT id, last_edited_by FROM malls WHERE id = ?');
$stmt->execute([$data['id']]);
$mall = $stmt->fetch();
if (!$mall) {
    json_error('Mall not found', 404);
}

// A mall manager may approve a pending edit to their own mall — but only
// when their own mall_staff made that edit, never when they submitted it
// themselves. Mirrors the store manager / store_staff self-approval rule.
if ($user['role'] === 'mall_manager') {
    $isOwnMall = $user['mall_id'] !== null && (int) $user['mall_id'] === (int) $mall['id'];
    $editedBySomeoneElse = $mall['last_edited_by'] !== null
        && (int) $mall['last_edited_by'] !== (int) $user['id'];
    if (!$isOwnMall || !$editedBySomeoneElse) {
        json_error('Forbidden: you can only approve edits your own staff submitted', 403);
    }
}

// A mall manager's "approve" doesn't go live yet — a super_admin still has
// to give final sign-off. Super_admin approving publishes immediately.
$writeStatus = ($user['role'] === 'mall_manager' && $data['status'] === 'approved')
    ? 'manager_approved'
    : $data['status'];

$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE malls SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A mall staff account is inactive from registration until their first
// submission is approved by the mall manager — activate it here too (a
// mall-profile edit approval counts, same as an ad approval).
if ($writeStatus === 'manager_approved' || $writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE mall_id = ? AND role = 'mall_staff' AND id = ?"
    )->execute([$data['id'], $mall['last_edited_by']]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
