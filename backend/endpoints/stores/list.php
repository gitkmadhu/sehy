<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();
$sql = "SELECT s.*, c.name AS category_name, m.name AS mall_name
        FROM stores s
        LEFT JOIN categories c ON c.id = s.category_id
        LEFT JOIN malls m ON m.id = s.mall_id
        WHERE s.status = 'approved'";
$params = [];

if (!empty($_GET['category_id'])) {
    $sql .= ' AND s.category_id = ?';
    $params[] = $_GET['category_id'];
}
if (!empty($_GET['mall_id'])) {
    $sql .= ' AND s.mall_id = ?';
    $params[] = $_GET['mall_id'];
}
if (!empty($_GET['q'])) {
    $sql .= ' AND s.name LIKE ?';
    $params[] = '%' . $_GET['q'] . '%';
}

$sql .= ' ORDER BY s.name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['stores' => $stmt->fetchAll()]);
