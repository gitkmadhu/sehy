<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();
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
if (!empty($_GET['city'])) {
    // target_city below is COALESCE(mall's city, store's city) for whichever
    // applies to this row's target_type — matched here the same way.
    $conditions[] = "COALESCE(m.city, s.city) = ?";
    $params[] = $_GET['city'];
}
if (!empty($_GET['mall_id'])) {
    $conditions[] = "p.target_type = 'mall' AND p.target_id = ?";
    $params[] = $_GET['mall_id'];
}
if (!empty($_GET['store_id'])) {
    $conditions[] = "p.target_type = 'store' AND p.target_id = ?";
    $params[] = $_GET['store_id'];
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
            CASE p.target_type WHEN 'mall' THEN m.name WHEN 'store' THEN s.name END AS target_name,
            COALESCE(m.city, s.city) AS target_city
        FROM payments p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN malls m ON p.target_type = 'mall' AND m.id = p.target_id
        LEFT JOIN stores s ON p.target_type = 'store' AND s.id = p.target_id"
    . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '')
    . ' ORDER BY p.created_at DESC
        LIMIT ' . max(1, min(500, (int) ($_GET['limit'] ?? 200)));

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

json_ok(['payments' => $stmt->fetchAll()]);
