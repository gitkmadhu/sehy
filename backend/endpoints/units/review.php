<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin', 'unit_manager']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}
if ($data['status'] === 'rejected' && empty(trim($data['note'] ?? ''))) {
    json_error('A reason is required when rejecting a unit profile edit', 422);
}

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT id, name, last_edited_by FROM units WHERE id = ?');
$stmt->execute([$data['id']]);
$unit = $stmt->fetch();
if (!$unit) {
    json_error('Unit not found', 404);
}

// A unit manager may only sign off on an edit their own staff made — never
// one they submitted themselves (same rule as category/service edits).
if ($user['role'] === 'unit_manager') {
    $isOwnUnit = $user['unit_id'] !== null && (int) $user['unit_id'] === (int) $unit['id'];
    $editedBySomeoneElse = $unit['last_edited_by'] !== null && (int) $unit['last_edited_by'] !== (int) $user['id'];
    if (!$isOwnUnit || !$editedBySomeoneElse) {
        json_error('Forbidden: you can only approve edits your own staff submitted', 403);
    }
}

// The manager's "approve" is only a sign-off — the unit stays hidden until
// the super_admin publishes it. A super_admin's approval publishes it.
$writeStatus = ($user['role'] === 'unit_manager' && $data['status'] === 'approved')
    ? 'manager_approved'
    : $data['status'];
$note = $data['status'] === 'rejected' ? trim($data['note']) : null;

$pdo->prepare('UPDATE units SET status = ?, review_note = ? WHERE id = ?')
    ->execute([$writeStatus, $note, $unit['id']]);

// A unit_staff account stays inactive until their first submission gets a sign-off.
if ($writeStatus === 'manager_approved' || $writeStatus === 'approved') {
    $pdo->prepare("UPDATE users SET is_active = 1 WHERE unit_id = ? AND role = 'unit_staff' AND id = ?")
        ->execute([$unit['id'], $unit['last_edited_by']]);
}

if (is_super_admin($user)) {
    log_admin_action($user, 'unit.review', 'unit', $unit['id'], ['status' => $writeStatus]);
}

json_ok(['id' => (int) $unit['id'], 'status' => $writeStatus]);
