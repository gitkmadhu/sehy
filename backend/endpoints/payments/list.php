<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = sehy_db();
$conditions = [];
$params = [];

if (!empty($_GET['purpose'])) {
    $conditions[] = 'p.purpose = ?';
    $params[] = $_GET['purpose'];
}
if (!empty($_GET['status'])) {
    $conditions[] = 'p.status = ?';
    $params[] = $_GET['status'];
}
if (!empty($_GET['user_id'])) {
    $conditions[] = 'p.user_id = ?';
    $params[] = $_GET['user_id'];
}
// --- Reports tab filters (admin.html) -------------------------------------
if (!empty($_GET['date_from'])) {
    $conditions[] = 'p.created_at >= ?';
    $params[] = $_GET['date_from'] . ' 00:00:00';
}
if (!empty($_GET['date_to'])) {
    $conditions[] = 'p.created_at <= ?';
    $params[] = $_GET['date_to'] . ' 23:59:59';
}
if (!empty($_GET['area'])) {
    // target_area below is COALESCE(category's area, service's area) for whichever
    // applies to this row's target_type — matched here the same way.
    $conditions[] = "COALESCE(m.area, s.area) = ?";
    $params[] = $_GET['area'];
}
if (!empty($_GET['category_id'])) {
    $conditions[] = "p.target_type = 'category' AND p.target_id = ?";
    $params[] = $_GET['category_id'];
}
if (!empty($_GET['service_id'])) {
    $conditions[] = "p.target_type = 'service' AND p.target_id = ?";
    $params[] = $_GET['service_id'];
}
if (!empty($_GET['product_name'])) {
    $conditions[] = 'p.product_name LIKE ?';
    $params[] = '%' . $_GET['product_name'] . '%';
}
if (!empty($_GET['brand_name'])) {
    $conditions[] = 'p.brand_name LIKE ?';
    $params[] = '%' . $_GET['brand_name'] . '%';
}

$sql = "SELECT p.*, u.name AS user_name, u.email AS user_email,
            CASE p.target_type WHEN 'category' THEN m.name WHEN 'service' THEN s.name END AS target_name,
            COALESCE(m.area, s.area) AS target_area
        FROM payments p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN categories m ON p.target_type = 'category' AND m.id = p.target_id
        LEFT JOIN services s ON p.target_type = 'service' AND s.id = p.target_id"
    . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '')
    . ' ORDER BY p.created_at DESC
        LIMIT ' . max(1, min(500, (int) ($_GET['limit'] ?? 200)));

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['payments' => $stmt->fetchAll()]);
