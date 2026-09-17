<?php
// TEMPORARY one-off endpoint — creates the admin_activity_log table on
// production (already created locally via direct DB access, which isn't
// available here anymore since Trusted Sources was locked down). Not part
// of the app. super_admin-only. Delete after use.
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();
$pdo->exec("
    CREATE TABLE IF NOT EXISTS admin_activity_log (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        user_name VARCHAR(150) NOT NULL,
        action VARCHAR(60) NOT NULL,
        target_type VARCHAR(40) NULL,
        target_id INT UNSIGNED NULL,
        details JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_activity_user (user_id),
        INDEX idx_admin_activity_created (created_at)
    ) ENGINE=InnoDB
");

json_ok(['created' => true]);
