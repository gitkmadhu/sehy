<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();

// Includes 'manager_approved' services/ads — signed off by their category/service
// manager but still awaiting this final admin publish step.
$services = $pdo->query(
    "SELECT s.*, u.name AS owner_name, u.email AS owner_email
     FROM services s JOIN users u ON u.id = s.owner_id
     WHERE s.status IN ('pending', 'manager_approved') ORDER BY s.created_at ASC"
)->fetchAll();

$offers = $pdo->query(
    "SELECT o.*, s.name AS service_name
     FROM offers o JOIN services s ON s.id = o.service_id
     WHERE o.status = 'pending' ORDER BY o.created_at ASC"
)->fetchAll();

$ads = $pdo->query(
    "SELECT a.*, m.name AS category_name, u.name AS uploaded_by_name
     FROM category_ads a JOIN categories m ON m.id = a.category_id
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.status IN ('pending', 'manager_approved') ORDER BY a.created_at ASC"
)->fetchAll();

$serviceAds = $pdo->query(
    "SELECT a.*, s.name AS service_name, u.name AS uploaded_by_name
     FROM service_ads a JOIN services s ON s.id = a.service_id
     LEFT JOIN users u ON u.id = a.uploaded_by
     WHERE a.status IN ('pending', 'manager_approved') ORDER BY a.created_at ASC"
)->fetchAll();

// Includes 'manager_approved' categories — signed off by their category manager but
// still awaiting this final admin publish step — same as services/ads above.
$categories = $pdo->query(
    "SELECT * FROM categories WHERE status IN ('pending', 'manager_approved') ORDER BY updated_at ASC"
)->fetchAll();

$categoryManagers = $pdo->query(
    "SELECT u.id, u.name, u.email, u.category_id, m.name AS category_name,
            m.gstin AS category_gstin, m.pan AS category_pan,
            m.gst_verified_status AS category_gst_verified_status,
            m.gst_registry_name AS category_gst_registry_name,
            m.pan_verified_status AS category_pan_verified_status,
            m.pan_registry_name AS category_pan_registry_name,
            u.created_at
     FROM users u JOIN categories m ON m.id = u.category_id
     WHERE u.role = 'category_manager' AND u.is_active = 0
     ORDER BY u.created_at ASC"
)->fetchAll();

json_ok([
    'services' => $services,
    'offers' => $offers,
    'ads' => $ads,
    'service_ads' => $serviceAds,
    'categories' => $categories,
    'category_managers' => $categoryManagers,
]);
