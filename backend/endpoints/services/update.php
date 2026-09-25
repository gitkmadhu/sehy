<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/upload.php';

$user = current_user();
require_fields($_POST, ['id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
$stmt->execute([$_POST['id']]);
$service = $stmt->fetch();

if (!$service) {
    json_error('Service not found', 404);
}
if (!can_manage_service($user, $service)) {
    json_error('Forbidden', 403);
}

$fields = [];
$params = [];
$editable = [
    'category_id', 'unit_id', 'area', 'tag_id', 'name', 'description', 'address',
    'latitude', 'longitude', 'phone', 'website', 'email', 'floor_unit', 'opening_hours', 'tagline', 'whatsapp',
    'instagram_channel_url', 'youtube_channel_url', 'facebook_channel_url', 'twitter_channel_url',
    'terms_text', 'privacy_text', 'refund_text', 'shipping_text', 'terms_url', 'privacy_url',
    'google_place_id',
];
foreach ($editable as $field) {
    if (isset($_POST[$field])) {
        $fields[] = "{$field} = ?";
        $params[] = ($field === 'unit_id' && $_POST[$field] === '') ? null : $_POST[$field];
    }
}

// The featured embed is a curation task delegated to service_staff, reviewed
// by the owner like any other staff edit — never something the owner sets
// directly. is_admin() can still set/clear it, same as every other field.
if ($user['role'] === 'service_staff' || is_admin($user)) {
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

$logoUrl = save_upload('logo', 'services', UPLOAD_LOGO_MAX_DIMENSION);
if ($logoUrl) {
    $fields[] = 'logo_url = ?';
    $params[] = $logoUrl;
}
$coverUrl = save_upload('cover', 'services');
if ($coverUrl) {
    $fields[] = 'cover_url = ?';
    $params[] = $coverUrl;
}

// A service owner editing their own service publishes immediately — there's no
// one else who'd review it (they own the whole approval chain for their
// service). A staff edit still goes to pending for the owner to review.
if (!is_admin($user)) {
    $fields[] = 'status = ?';
    $params[] = $user['role'] === 'service_owner' ? 'approved' : 'pending';
}

// Tracks who actually made this edit — lets the service manager approve an
// edit their own service_staff submitted, without ever approving their own.
$fields[] = 'last_edited_by = ?';
$params[] = $user['id'];

if ($fields) {
    $params[] = $service['id'];
    $pdo->prepare('UPDATE services SET ' . implode(', ', $fields) . ' WHERE id = ?')
        ->execute($params);
}

json_ok(['id' => (int) $service['id']]);
