<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_role($user, ['admin', 'unit_manager', 'unit_staff']);

// Accepts multipart (profile edits with image uploads) or plain JSON (quick
// admin actions like a rename).
$input = !empty($_POST) ? $_POST : body();
require_fields($input, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM units WHERE id = ?');
$stmt->execute([$input['id']]);
$unit = $stmt->fetch();
if (!$unit) {
    json_error('Unit not found', 404);
}
if (!can_manage_unit($user, $unit)) {
    json_error('Forbidden: this is not your unit', 403);
}

$fields = [];
$params = [];

$editable = [
    'name', 'description',
    'instagram_channel_url', 'youtube_channel_url', 'facebook_channel_url', 'twitter_channel_url',
];
foreach ($editable as $field) {
    if (array_key_exists($field, $input)) {
        $value = trim((string) $input[$field]);
        if ($field === 'name') {
            if ($value === '') {
                json_error('Name cannot be empty', 422);
            }
            $stmt = $pdo->prepare('SELECT id FROM units WHERE category_id = ? AND name = ? AND id <> ?');
            $stmt->execute([$unit['category_id'], $value, $unit['id']]);
            if ($stmt->fetch()) {
                json_error('This category already has a unit with that name', 409);
            }
        }
        $fields[] = "{$field} = ?";
        $params[] = ($value === '' && $field !== 'name') ? null : $value;
    }
}

// Display order is an admin-only layout decision.
if (is_admin($user) && isset($input['sort_order'])) {
    $fields[] = 'sort_order = ?';
    $params[] = (int) $input['sort_order'];
}

$logoUrl = save_upload('logo', 'units', UPLOAD_LOGO_MAX_DIMENSION);
if ($logoUrl) {
    $fields[] = 'logo_url = ?';
    $params[] = $logoUrl;
}
$coverUrl = save_upload('cover', 'units');
if ($coverUrl) {
    $fields[] = 'cover_url = ?';
    $params[] = $coverUrl;
}

// An admin's own edit stays live — nobody sits above them to hand off to. A
// unit_manager or unit_staff edit goes back to pending, for the manager and
// then the super_admin to approve before it's published again.
if (!is_admin($user) && $fields) {
    $fields[] = "status = 'pending'";
    $fields[] = 'review_note = NULL';
    $fields[] = 'last_edited_by = ?';
    $params[] = $user['id'];
}

if ($fields) {
    $params[] = $unit['id'];
    $pdo->prepare('UPDATE units SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
}

if (is_admin($user)) {
    log_admin_action($user, 'unit.update', 'unit', $unit['id'], ['fields' => array_keys($input)]);
} elseif ($fields && $user['role'] === 'unit_staff') {
    // Tell the unit's manager there's an edit waiting for their sign-off.
    $stmt = $pdo->prepare("SELECT id FROM users WHERE unit_id = ? AND role = 'unit_manager' LIMIT 1");
    $stmt->execute([$unit['id']]);
    $managerId = $stmt->fetchColumn();
    if ($managerId) {
        $pdo->prepare('INSERT INTO user_notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)')
            ->execute([
                $managerId,
                'unit_edit_pending',
                'Unit profile edit to review',
                "{$user['name']} updated the profile of {$unit['name']}",
                json_encode(['unit_id' => (int) $unit['id']]),
            ]);
    }
}

json_ok(['id' => (int) $unit['id']]);
