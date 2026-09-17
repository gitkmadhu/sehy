<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();
$sql = 'SELECT * FROM admin_activity_log ORDER BY created_at DESC LIMIT '
    . max(1, min(500, (int) ($_GET['limit'] ?? 200)));

$entries = $pdo->query($sql)->fetchAll();
foreach ($entries as &$entry) {
    $entry['details'] = json_decode($entry['details'] ?? '', true) ?? [];
}

json_ok(['entries' => $entries]);
