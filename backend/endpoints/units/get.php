<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

require_fields($_GET, ['id']);

$pdo = sehy_db();

$stmt = $pdo->prepare(
    'SELECT u.*, c.name AS category_name FROM units u JOIN categories c ON c.id = u.category_id WHERE u.id = ?'
);
$stmt->execute([$_GET['id']]);
$unit = $stmt->fetch();
if (!$unit) {
    json_error('Unit not found', 404);
}
// Unpublished units are only visible to admins and the unit's own manager/staff.
if ($unit['status'] !== 'approved') {
    $viewer = current_user_optional();
    if (!$viewer || !can_manage_unit($viewer, $unit)) {
        json_error('Unit not found', 404);
    }
}

$stmt = $pdo->prepare(
    "SELECT s.id, s.name, s.logo_url, s.tagline, s.address, s.area, t.name AS tag_name
     FROM services s
     LEFT JOIN tags t ON t.id = s.tag_id
     WHERE s.unit_id = ? AND s.status = 'approved'
     ORDER BY s.name ASC"
);
$stmt->execute([$unit['id']]);
$unit['services'] = $stmt->fetchAll();

json_ok(['unit' => $unit]);
