<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();

// Public callers (and any signed-in non-admin) only see live malls. An
// admin managing the Cities & Malls list needs to see every mall regardless
// of status, so they can still edit/delete one mid-review.
$user = current_user_optional();
$isAdmin = is_admin($user);

$conditions = $isAdmin ? [] : ["status = 'approved'"];
$params = [];

if (!empty($_GET['city'])) {
    $conditions[] = 'city = ?';
    $params[] = $_GET['city'];
}

$sql = 'SELECT * FROM malls' . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '');

$sql .= ' ORDER BY name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['malls' => $stmt->fetchAll()]);
