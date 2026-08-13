<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();
$sql = "SELECT o.*, s.name AS store_name, s.logo_url AS store_logo_url,
               s.latitude AS store_latitude, s.longitude AS store_longitude,
               c.name AS category_name
        FROM offers o
        JOIN stores s ON s.id = o.store_id
        LEFT JOIN categories c ON c.id = o.category_id
        WHERE o.status = 'approved' AND o.expires_at > NOW()";
$params = [];

if (!empty($_GET['category_id'])) {
    $sql .= ' AND o.category_id = ?';
    $params[] = $_GET['category_id'];
}
if (!empty($_GET['store_id'])) {
    $sql .= ' AND o.store_id = ?';
    $params[] = $_GET['store_id'];
}
if (!empty($_GET['q'])) {
    $sql .= ' AND (o.title LIKE ? OR o.description LIKE ?)';
    $params[] = '%' . $_GET['q'] . '%';
    $params[] = '%' . $_GET['q'] . '%';
}

$sql .= ' ORDER BY o.created_at DESC';

if (!empty($_GET['limit'])) {
    $sql .= ' LIMIT ' . (int) $_GET['limit'];
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['offers' => $stmt->fetchAll()]);
