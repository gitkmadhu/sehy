<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Every service regardless of status, for the admin Overview drill-down — the
// public-facing services/list.php hard-filters to status='approved' with no
// admin bypass, so this exists purely for that internal view.
$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();
$services = $pdo->query(
    "SELECT s.id, s.name, s.category_id, s.area, s.status, s.tag_id, c.name AS tag_name,
            u.name AS owner_name
     FROM services s
     JOIN users u ON u.id = s.owner_id
     LEFT JOIN tags c ON c.id = s.tag_id
     ORDER BY s.name ASC"
)->fetchAll();

json_ok(['services' => $services]);
