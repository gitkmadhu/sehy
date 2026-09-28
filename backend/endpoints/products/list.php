<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Public — powers the Products checklist on register.html and My Service.
$pdo = sehy_db();

$sql = 'SELECT id, category_id, name, sort_order FROM products';
$params = [];
if (!empty($_GET['category_id'])) {
    $sql .= ' WHERE category_id = ?';
    $params[] = $_GET['category_id'];
}
$sql .= ' ORDER BY sort_order ASC, name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['products' => $stmt->fetchAll()]);
