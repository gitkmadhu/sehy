<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['open', 'investigating', 'resolved'], true)) {
    json_error('status must be open, investigating, or resolved', 422);
}

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT * FROM incidents WHERE id = ?');
$stmt->execute([$data['id']]);
$incident = $stmt->fetch();
if (!$incident) {
    json_error('Incident not found', 404);
}

// A status-only update (e.g. opening -> investigating before notes exist)
// must not wipe out root_cause/corrective_action already saved.
$rootCause = array_key_exists('root_cause', $data) ? trim($data['root_cause']) : $incident['root_cause'];
$correctiveAction = array_key_exists('corrective_action', $data) ? trim($data['corrective_action']) : $incident['corrective_action'];
$resolvedAt = $data['status'] === 'resolved' ? ($incident['resolved_at'] ?? date('Y-m-d H:i:s')) : null;

$pdo->prepare(
    'UPDATE incidents SET status = ?, root_cause = ?, corrective_action = ?, resolved_at = ? WHERE id = ?'
)->execute([$data['status'], $rootCause, $correctiveAction, $resolvedAt, $data['id']]);

json_ok(['id' => (int) $data['id'], 'status' => $data['status']]);
