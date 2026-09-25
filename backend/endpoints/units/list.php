<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();

// Public callers only see approved (published) units; an admin managing the
// list sees every unit and its review status (?all=1).
$user = current_user_optional();
$all = is_admin($user) && !empty($_GET['all']);

$sql = "SELECT u.id, u.category_id, u.name, u.description, u.logo_url, u.sort_order, u.status, u.review_note,
               c.name AS category_name,
               (SELECT COUNT(*) FROM services s WHERE s.unit_id = u.id AND s.status = 'approved') AS service_count
        FROM units u
        JOIN categories c ON c.id = u.category_id";
$conditions = [];
$params = [];
if (!$all) {
    $conditions[] = "u.status = 'approved'";
}
if (!empty($_GET['category_id'])) {
    $conditions[] = 'u.category_id = ?';
    $params[] = $_GET['category_id'];
}
if ($conditions) {
    $sql .= ' WHERE ' . implode(' AND ', $conditions);
}
$sql .= ' ORDER BY c.name ASC, u.sort_order ASC, u.name ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['units' => $stmt->fetchAll()]);
