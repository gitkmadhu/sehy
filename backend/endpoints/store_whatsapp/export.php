<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// GLML does not send WhatsApp messages itself — real bulk sending needs a
// Meta-verified WhatsApp Business Account and approved templates per
// business, which isn't something GLML can set up on a store's behalf. This
// endpoint only lets a store export its opt-in list to use with their own
// phone or a third-party WhatsApp Business tool.

$user = current_user();
require_fields($_GET, ['store_id']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM stores WHERE id = ?');
$stmt->execute([$_GET['store_id']]);
$store = $stmt->fetch();

if (!$store) {
    json_error('Store not found', 404);
}
if (!can_manage_store($user, $store)) {
    json_error('Forbidden', 403);
}

$stmt = $pdo->prepare(
    'SELECT phone, created_at FROM store_whatsapp_subscribers WHERE store_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$store['id']]);

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="whatsapp-subscribers.csv"');

$out = fopen('php://output', 'w');
fputcsv($out, ['phone', 'subscribed_at']);
while ($row = $stmt->fetch()) {
    fputcsv($out, [$row['phone'], $row['created_at']]);
}
fclose($out);
