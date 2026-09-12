<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Every store regardless of status, for the admin Overview drill-down — the
// public-facing stores/list.php hard-filters to status='approved' with no
// admin bypass, so this exists purely for that internal view.
$user = current_user();
require_role($user, ['admin']);

$pdo = gmls_db();
$stores = $pdo->query(
    "SELECT s.id, s.name, s.mall_id, s.city, s.status, s.category_id, c.name AS category_name,
            u.name AS owner_name
     FROM stores s
     JOIN users u ON u.id = s.owner_id
     LEFT JOIN categories c ON c.id = s.category_id
     ORDER BY s.name ASC"
)->fetchAll();

json_ok(['stores' => $stores]);
