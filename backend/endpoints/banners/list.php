<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();

// Public callers only see banners currently inside their scheduling window.
// Admin managing the App Banners panel needs to see every banner regardless
// of window, plus a computed status to label each row.
$user = current_user_optional();
$isAdmin = is_admin($user);

if ($isAdmin) {
    $sql = "SELECT *,
        CASE
            WHEN start_at IS NOT NULL AND start_at > NOW() THEN 'scheduled'
            WHEN end_at IS NOT NULL AND end_at < NOW() THEN 'expired'
            ELSE 'active'
        END AS window_status
        FROM banners ORDER BY id DESC";
    $stmt = $pdo->query($sql);
} else {
    $stmt = $pdo->query(
        "SELECT * FROM banners
         WHERE (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW())
         ORDER BY id ASC"
    );
}

json_ok(['banners' => $stmt->fetchAll()]);
