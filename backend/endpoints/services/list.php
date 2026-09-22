<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();
$sql = "SELECT s.*, c.name AS tag_name, m.name AS category_name
        FROM services s
        LEFT JOIN tags c ON c.id = s.tag_id
        LEFT JOIN categories m ON m.id = s.category_id
        WHERE s.status = 'approved'";
$params = [];

if (!empty($_GET['tag_id'])) {
    $sql .= ' AND s.tag_id = ?';
    $params[] = $_GET['tag_id'];
}
if (!empty($_GET['category_id'])) {
    $sql .= ' AND s.category_id = ?';
    $params[] = $_GET['category_id'];
}
if (!empty($_GET['area'])) {
    $sql .= ' AND (s.area = ? OR m.area = ?)';
    $params[] = $_GET['area'];
    $params[] = $_GET['area'];
}
if (!empty($_GET['q'])) {
    $sql .= ' AND s.name LIKE ?';
    $params[] = '%' . $_GET['q'] . '%';
}

$sql .= ' ORDER BY s.name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['services' => $stmt->fetchAll()]);
