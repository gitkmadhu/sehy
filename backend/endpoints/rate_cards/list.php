<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();

// Public callers (and any signed-in non-admin) only see active plans, e.g.
// for the manager-dashboard subscription picker. Admin managing the Rate
// Cards panel needs to see every plan, including any turned off.
$user = current_user_optional();
$isAdmin = is_admin($user);

$conditions = $isAdmin ? [] : ['is_active = 1'];
$params = [];

if (!empty($_GET['tier'])) {
    $conditions[] = 'tier = ?';
    $params[] = $_GET['tier'];
}

$sql = 'SELECT * FROM rate_cards' . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '');
$sql .= ' ORDER BY tier ASC, duration_days ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['rate_cards' => $stmt->fetchAll()]);
