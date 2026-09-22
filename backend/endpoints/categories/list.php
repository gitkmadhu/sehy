<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();

// Public callers (and any signed-in non-admin) only see live categories. An
// admin managing the Areas & Categories list needs to see every category regardless
// of status, so they can still edit/delete one mid-review.
$user = current_user_optional();
$isAdmin = is_admin($user);

$conditions = $isAdmin ? [] : ["status = 'approved'"];
$params = [];

if (!empty($_GET['area'])) {
    $conditions[] = 'area = ?';
    $params[] = $_GET['area'];
}

$sql = 'SELECT * FROM categories' . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '');

$sql .= ' ORDER BY name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['categories' => $stmt->fetchAll()]);
