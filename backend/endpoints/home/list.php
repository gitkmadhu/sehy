<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();

// Every category is a home page section: its units, plus any approved
// services in the category that haven't been placed in a unit yet.
$categories = $pdo->query(
    "SELECT id, name, description, logo_url FROM categories WHERE status = 'approved' ORDER BY name ASC"
)->fetchAll();

$unitStmt = $pdo->prepare(
    "SELECT u.id, u.name, u.description, u.logo_url,
            (SELECT COUNT(*) FROM services s WHERE s.unit_id = u.id AND s.status = 'approved') AS service_count
     FROM units u WHERE u.category_id = ? AND u.status = 'approved' ORDER BY u.sort_order ASC, u.name ASC"
);
$svcStmt = $pdo->prepare(
    "SELECT s.id, s.name, s.logo_url, s.tagline, s.area, t.name AS tag_name
     FROM services s LEFT JOIN tags t ON t.id = s.tag_id
     WHERE s.category_id = ? AND s.unit_id IS NULL AND s.status = 'approved'
     ORDER BY s.name ASC LIMIT 12"
);

foreach ($categories as &$category) {
    $unitStmt->execute([$category['id']]);
    $category['units'] = $unitStmt->fetchAll();
    $svcStmt->execute([$category['id']]);
    $category['services'] = $svcStmt->fetchAll();
}
unset($category);

json_ok(['sections' => $categories]);
