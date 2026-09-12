<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// One combined view of every banner on the platform, regardless of type —
// banners/list.php and city_banners/list.php already return everything for
// an admin caller (same window_status CASE reused here), but mall_ads/
// store_ads have no equivalent admin-wide endpoint: mall_ads/list.php and
// store_ads/list.php are public+approved-only, and mall_ads/mine.php /
// store_ads/mine.php are scoped to the caller's own mall/store. This is
// purely for the admin "All Banners" overview tab.
$user = current_user();
require_role($user, ['admin']);

$pdo = gmls_db();

$windowStatusCase = "CASE
    WHEN start_at IS NOT NULL AND start_at > NOW() THEN 'scheduled'
    WHEN end_at IS NOT NULL AND end_at < NOW() THEN 'expired'
    ELSE 'active'
END AS window_status";

$banners = $pdo->query("SELECT *, {$windowStatusCase} FROM banners ORDER BY id DESC")->fetchAll();

$cityBanners = $pdo->query(
    "SELECT *, {$windowStatusCase} FROM city_banners ORDER BY city ASC, id DESC"
)->fetchAll();

$mallAds = $pdo->query(
    "SELECT a.*, m.name AS mall_name
     FROM mall_ads a JOIN malls m ON m.id = a.mall_id
     ORDER BY a.created_at DESC"
)->fetchAll();

$storeAds = $pdo->query(
    "SELECT a.*, s.name AS store_name
     FROM store_ads a JOIN stores s ON s.id = a.store_id
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok([
    'banners' => $banners,
    'city_banners' => $cityBanners,
    'mall_ads' => $mallAds,
    'store_ads' => $storeAds,
]);
