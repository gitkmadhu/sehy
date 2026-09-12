<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['plan_key']);

$pdo = gmls_db();
$stmt = $pdo->prepare('SELECT id FROM rate_cards WHERE plan_key = ?');
$stmt->execute([$data['plan_key']]);
if (!$stmt->fetch()) {
    json_error('Unknown plan_key', 404);
}

// Price (and label/active flag) only — tier, duration_days, and plan_key
// itself are fixed at seed time, not admin-editable in v1.
$fields = [];
$params = [];

if (isset($data['amount'])) {
    $fields[] = 'amount = ?';
    $params[] = (int) $data['amount'];
}
if (isset($data['label'])) {
    $fields[] = 'label = ?';
    $params[] = $data['label'];
}
if (isset($data['is_active'])) {
    $fields[] = 'is_active = ?';
    $params[] = $data['is_active'] ? 1 : 0;
}

if ($fields) {
    $params[] = $data['plan_key'];
    $pdo->prepare('UPDATE rate_cards SET ' . implode(', ', $fields) . ' WHERE plan_key = ?')->execute($params);
}

json_ok(['plan_key' => $data['plan_key']]);
