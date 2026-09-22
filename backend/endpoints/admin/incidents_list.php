<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = sehy_db();
$conditions = [];
$params = [];

if (!empty($_GET['status'])) {
    $conditions[] = 'status = ?';
    $params[] = $_GET['status'];
}
if (!empty($_GET['type'])) {
    $conditions[] = 'type = ?';
    $params[] = $_GET['type'];
}

// Open/investigating first (what needs attention), then most recently active.
$sql = 'SELECT * FROM incidents'
    . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '')
    . " ORDER BY (status = 'resolved') ASC, last_seen_at DESC
        LIMIT " . max(1, min(500, (int) ($_GET['limit'] ?? 200)));

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$incidents = $stmt->fetchAll();

foreach ($incidents as &$incident) {
    $incident['context'] = json_decode($incident['context'] ?? '', true) ?? [];
}

json_ok(['incidents' => $incidents]);
