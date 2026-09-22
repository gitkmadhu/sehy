<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin', 'category_manager']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting a category profile edit', 422);
}

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT id, last_edited_by FROM categories WHERE id = ?');
$stmt->execute([$data['id']]);
$category = $stmt->fetch();
if (!$category) {
    json_error('Category not found', 404);
}

// A category manager may approve a pending edit to their own category — but only
// when their own category_staff made that edit, never when they submitted it
// themselves. Mirrors the service manager / service_staff self-approval rule.
if ($user['role'] === 'category_manager') {
    $isOwnCategory = $user['category_id'] !== null && (int) $user['category_id'] === (int) $category['id'];
    $editedBySomeoneElse = $category['last_edited_by'] !== null
        && (int) $category['last_edited_by'] !== (int) $user['id'];
    if (!$isOwnCategory || !$editedBySomeoneElse) {
        json_error('Forbidden: you can only approve edits your own staff submitted', 403);
    }
}

// A category manager's "approve" doesn't go live yet — a super_admin still has
// to give final sign-off. Super_admin approving publishes immediately.
$writeStatus = ($user['role'] === 'category_manager' && $data['status'] === 'approved')
    ? 'manager_approved'
    : $data['status'];

$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE categories SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A category staff account is inactive from registration until their first
// submission is approved by the category manager — activate it here too (a
// category-profile edit approval counts, same as an ad approval).
if ($writeStatus === 'manager_approved' || $writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE category_id = ? AND role = 'category_staff' AND id = ?"
    )->execute([$data['id'], $category['last_edited_by']]);
}

if (is_super_admin($user)) {
    log_admin_action($user, 'category.review', 'category', $data['id'], ['status' => $writeStatus]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
