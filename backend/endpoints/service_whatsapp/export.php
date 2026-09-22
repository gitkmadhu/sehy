<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Sehy does not send WhatsApp messages itself — real bulk sending needs a
// Meta-verified WhatsApp Business Account and approved templates per
// business, which isn't something Sehy can set up on a service's behalf. This
// endpoint only lets a service export its opt-in list to use with their own
// phone or a third-party WhatsApp Business tool.

$user = current_user();
require_fields($_GET, ['service_id']);

$pdo = sehy_db();
$stmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
$stmt->execute([$_GET['service_id']]);
$service = $stmt->fetch();

if (!$service) {
    json_error('Service not found', 404);
}
if (!can_manage_service($user, $service)) {
    json_error('Forbidden', 403);
}

$stmt = $pdo->prepare(
    'SELECT phone, created_at FROM service_whatsapp_subscribers WHERE service_id = ? ORDER BY created_at DESC'
);
$stmt->execute([$service['id']]);

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="whatsapp-subscribers.csv"');

$out = fopen('php://output', 'w');
fputcsv($out, ['phone', 'subscribed_at']);
while ($row = $stmt->fetch()) {
    fputcsv($out, [$row['phone'], $row['created_at']]);
}
fclose($out);
