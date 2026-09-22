<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// One combined view of every banner on the platform, regardless of type —
// banners/list.php and area_banners/list.php already return everything for
// an admin caller (same window_status CASE reused here), but category_ads/
// service_ads have no equivalent admin-wide endpoint: category_ads/list.php and
// service_ads/list.php are public+approved-only, and category_ads/mine.php /
// service_ads/mine.php are scoped to the caller's own category/service. This is
// purely for the admin "All Banners" overview tab.
$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();

$windowStatusCase = "CASE
    WHEN start_at IS NOT NULL AND start_at > NOW() THEN 'scheduled'
    WHEN end_at IS NOT NULL AND end_at < NOW() THEN 'expired'
    ELSE 'active'
END AS window_status";

$banners = $pdo->query("SELECT *, {$windowStatusCase} FROM banners ORDER BY id DESC")->fetchAll();

$areaBanners = $pdo->query(
    "SELECT *, {$windowStatusCase} FROM area_banners ORDER BY area ASC, id DESC"
)->fetchAll();

$categoryAds = $pdo->query(
    "SELECT a.*, m.name AS category_name
     FROM category_ads a JOIN categories m ON m.id = a.category_id
     ORDER BY a.created_at DESC"
)->fetchAll();

$serviceAds = $pdo->query(
    "SELECT a.*, s.name AS service_name
     FROM service_ads a JOIN services s ON s.id = a.service_id
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok([
    'banners' => $banners,
    'area_banners' => $areaBanners,
    'category_ads' => $categoryAds,
    'service_ads' => $serviceAds,
]);
