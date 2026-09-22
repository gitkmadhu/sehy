<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['category_manager', 'admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting an ad', 422);
}

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT category_id, uploaded_by FROM category_ads WHERE id = ?');
$stmt->execute([$data['id']]);
$ad = $stmt->fetch();

if (!$ad) {
    json_error('Ad not found', 404);
}

// A category manager may only review ads inside their own category. Admin has no
// such scoping — they're the final sign-off for any category.
if ($user['role'] === 'category_manager') {
    if ($user['category_id'] === null || (int) $ad['category_id'] !== (int) $user['category_id']) {
        json_error('Forbidden: this ad is not in your category', 403);
    }
}

// A category manager's approval publishes immediately, same as an admin's — the
// manager is the sole gate for their own category's ads now (no separate app
// admin final-publish step). (A manager's own direct upload never reaches
// this endpoint — it auto-publishes at creation instead — so every
// category_manager approval here is inherently staff-originated.)
$writeStatus = $data['status'];

$note = $data['status'] === 'rejected' ? trim($data['note']) : null;
$pdo->prepare('UPDATE category_ads SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $data['id']]);

// A category staff account is inactive from registration until their first ad is
// approved by the category manager — activate it here.
if ($writeStatus === 'approved') {
    $pdo->prepare(
        "UPDATE users SET is_active = 1 WHERE id = ? AND role = 'category_staff'"
    )->execute([$ad['uploaded_by']]);
}

json_ok(['id' => (int) $data['id'], 'status' => $writeStatus]);
