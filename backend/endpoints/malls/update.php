<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';
require_once __DIR__ . '/../../lib/razorpay.php';

$user = current_user();
require_role($user, ['super_admin', 'mall_manager', 'mall_staff']);
require_fields($_POST, ['id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT id FROM malls WHERE id = ?');
$stmt->execute([$_POST['id']]);
if (!$stmt->fetch()) {
    json_error('Mall not found', 404);
}

// A mall manager or mall staff may only edit their own linked mall.
if (!is_super_admin($user)) {
    if ($user['mall_id'] === null || (int) $user['mall_id'] !== (int) $_POST['id']) {
        json_error('Forbidden: this is not your mall', 403);
    }
}

$fields = [];
$params = [];
$editable = [
    'name', 'description', 'address', 'city',
    'instagram_channel_url', 'youtube_channel_url', 'facebook_channel_url', 'twitter_channel_url',
    'google_place_id',
];
foreach ($editable as $field) {
    if (isset($_POST[$field])) {
        $fields[] = "{$field} = ?";
        $params[] = $_POST[$field];
    }
}

// The featured embed is a curation task delegated to mall_staff, reviewed
// by the manager like any other staff edit — never something the manager
// sets directly. A super_admin can still set/clear it, same as every other field.
if ($user['role'] === 'mall_staff' || is_super_admin($user)) {
    $embedHosts = [
        'embed_instagram_url' => ['instagram.com'],
        'embed_youtube_url' => ['youtube.com', 'youtu.be'],
        'embed_facebook_url' => ['facebook.com', 'fb.watch'],
        'embed_twitter_url' => ['twitter.com', 'x.com'],
    ];
    foreach ($embedHosts as $field => $hosts) {
        if (!isset($_POST[$field])) {
            continue;
        }
        $value = $_POST[$field];
        $matchesHost = false;
        foreach ($hosts as $host) {
            if (str_contains($value, $host)) {
                $matchesHost = true;
                break;
            }
        }
        if ($value !== '' && !$matchesHost) {
            $label = ucfirst(str_replace(['embed_', '_url'], '', $field));
            json_error("That doesn't look like a {$label} URL", 422);
        }
        $fields[] = "{$field} = ?";
        $params[] = $value === '' ? null : $value;
    }
}

// Only a super_admin may change the official signup email domain — it gates
// who can register as this mall's manager, so staff/manager edits can't touch it.
if (is_super_admin($user) && isset($_POST['email_domain'])) {
    $fields[] = 'email_domain = ?';
    $params[] = $_POST['email_domain'] === '' ? null : strtolower(ltrim(trim($_POST['email_domain']), '@'));
}

$logoUrl = save_upload('logo', 'malls', UPLOAD_LOGO_MAX_DIMENSION);
if ($logoUrl) {
    $fields[] = 'logo_url = ?';
    $params[] = $logoUrl;
}

// A super_admin's own edit stays live immediately — a mall is only ever
// super_admin-created in the first place, so there's no one above them to
// hand off to. A manager or staff edit goes back to pending review, same
// reasoning as stores/update.php.
if (!is_super_admin($user)) {
    $fields[] = "status = 'pending'";
    $fields[] = 'last_edited_by = ?';
    $params[] = $user['id'];
}

if ($fields) {
    $params[] = $_POST['id'];
    $pdo->prepare('UPDATE malls SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
}

// Super-admin-only manual subscription override (comp a free window, or
// force an expiry) — on top of the mall manager's own self-service Razorpay
// purchase via payments/create_order.php's 'mall_subscription' case.
// Separate from the $fields update above since extend_days is a SQL
// expression, not a plain bound value.
if (is_super_admin($user)) {
    if (isset($_POST['extend_days']) && $_POST['extend_days'] !== '') {
        mall_extend_subscription($pdo, (int) $_POST['id'], (int) $_POST['extend_days']);
    } elseif (isset($_POST['subscription_expires_at'])) {
        $value = $_POST['subscription_expires_at'] === '' ? null : $_POST['subscription_expires_at'];
        if ($value !== null && strtotime($value) === false) {
            json_error('Invalid subscription_expires_at', 422);
        }
        $pdo->prepare('UPDATE malls SET subscription_expires_at = ? WHERE id = ?')->execute([$value, $_POST['id']]);
    }
}

json_ok(['id' => (int) $_POST['id']]);
