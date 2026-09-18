<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/eko_kyc.php';

// Deliberately admin-triggered, never automatic at store/mall submission
// time — mirrors admin/refresh_ratings.php's existing pattern for the
// also-paid, rate-limited Google Places lookup. Keeps submission fast and
// failure-proof regardless of Eko's uptime, and puts spend under admin's
// control.
$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['entity_type', 'id']);

$entityType = $data['entity_type'];
if (!in_array($entityType, ['store', 'mall'], true)) {
    json_error('entity_type must be "store" or "mall"', 422);
}
$table = $entityType === 'store' ? 'stores' : 'malls';

$pdo = gmls_db();
$stmt = $pdo->prepare("SELECT id, name, gstin, pan FROM {$table} WHERE id = ?");
$stmt->execute([$data['id']]);
$entity = $stmt->fetch();

if (!$entity) {
    json_error(ucfirst($entityType) . ' not found', 404);
}
if (!$entity['gstin'] && !$entity['pan']) {
    json_error('No GSTIN or PAN submitted for this ' . $entityType . ' yet', 422);
}

if (EKO_DEVELOPER_KEY === '' || EKO_INITIATOR_ID === '') {
    json_ok(['configured' => false]);
}

$gstResult = $entity['gstin'] ? verify_gstin_registry($entity['gstin'], $entity['name']) : null;
$panResult = $entity['pan'] ? verify_pan_registry($entity['pan']) : null;

$pdo->prepare(
    "UPDATE {$table} SET
        gst_verified_status = ?, gst_registry_name = ?,
        pan_verified_status = ?, pan_registry_name = ?,
        kyc_verified_at = NOW()
     WHERE id = ?"
)->execute([
    $gstResult['status'] ?? null,
    $gstResult['legal_name'] ?? null,
    $panResult['status'] ?? null,
    $panResult['registered_name'] ?? null,
    $entity['id'],
]);

log_admin_action($user, 'kyc.verify', $entityType, $entity['id'], [
    'gst_result' => $gstResult,
    'pan_result' => $panResult,
]);

json_ok([
    'configured' => true,
    'gst' => $gstResult,
    'pan' => $panResult,
]);
