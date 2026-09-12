<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

require_fields($_GET, ['id']);

$pdo = gmls_db();

$stmt = $pdo->prepare('SELECT * FROM malls WHERE id = ?');
$stmt->execute([$_GET['id']]);
$mall = $stmt->fetch();

if (!$mall) {
    json_error('Mall not found', 404);
}

$stmt = $pdo->prepare(
    "SELECT s.*, c.name AS category_name, m.name AS mall_name
     FROM stores s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN malls m ON m.id = s.mall_id
     WHERE s.mall_id = ? AND s.status = 'approved'
     ORDER BY s.name ASC"
);
$stmt->execute([$mall['id']]);
$mall['stores'] = $stmt->fetchAll();

json_ok(['mall' => $mall]);
