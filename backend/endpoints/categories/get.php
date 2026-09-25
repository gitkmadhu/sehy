<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

require_fields($_GET, ['id']);

$pdo = sehy_db();

$stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
$stmt->execute([$_GET['id']]);
$category = $stmt->fetch();

if (!$category) {
    json_error('Category not found', 404);
}

// Categories are global sections shared across every area (unlike the old
// mall, which lived in one city) — an optional ?area= narrows the nested
// service list to just that area, which is how the app's area screen always
// calls this (a caller wanting every area's services for this category, e.g.
// an admin view, just omits it).
$sql = "SELECT s.*, c.name AS tag_name, m.name AS category_name
     FROM services s
     LEFT JOIN tags c ON c.id = s.tag_id
     LEFT JOIN categories m ON m.id = s.category_id
     WHERE s.category_id = ? AND s.status = 'approved'";
$params = [$category['id']];
if (!empty($_GET['area'])) {
    $sql .= ' AND s.area = ?';
    $params[] = $_GET['area'];
}
$sql .= ' ORDER BY s.name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$category['services'] = $stmt->fetchAll();

$stmt = $pdo->prepare(
    "SELECT u.id, u.name, u.description, u.logo_url,
            (SELECT COUNT(*) FROM services s WHERE s.unit_id = u.id AND s.status = 'approved') AS service_count
     FROM units u WHERE u.category_id = ? AND u.status = 'approved' ORDER BY u.sort_order ASC, u.name ASC"
);
$stmt->execute([$category['id']]);
$category['units'] = $stmt->fetchAll();

json_ok(['category' => $category]);
