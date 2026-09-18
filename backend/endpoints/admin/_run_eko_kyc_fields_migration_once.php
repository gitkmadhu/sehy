<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../config/migration.php';

if (!hash_equals(MIGRATION_API_KEY, raw_authorization_header())) {
    json_error('Unauthorized', 401);
}

$pdo = gmls_db();

$statements = [
    "ALTER TABLE malls ADD COLUMN gst_verified_status VARCHAR(50) NULL AFTER pan",
    "ALTER TABLE malls ADD COLUMN gst_registry_name VARCHAR(255) NULL AFTER gst_verified_status",
    "ALTER TABLE malls ADD COLUMN pan_verified_status VARCHAR(50) NULL AFTER gst_registry_name",
    "ALTER TABLE malls ADD COLUMN pan_registry_name VARCHAR(255) NULL AFTER pan_verified_status",
    "ALTER TABLE malls ADD COLUMN kyc_verified_at DATETIME NULL AFTER pan_registry_name",
    "ALTER TABLE stores ADD COLUMN gst_verified_status VARCHAR(50) NULL AFTER pan",
    "ALTER TABLE stores ADD COLUMN gst_registry_name VARCHAR(255) NULL AFTER gst_verified_status",
    "ALTER TABLE stores ADD COLUMN pan_verified_status VARCHAR(50) NULL AFTER gst_registry_name",
    "ALTER TABLE stores ADD COLUMN pan_registry_name VARCHAR(255) NULL AFTER pan_verified_status",
    "ALTER TABLE stores ADD COLUMN kyc_verified_at DATETIME NULL AFTER pan_registry_name",
];

$results = [];
foreach ($statements as $sql) {
    try {
        $pdo->exec($sql);
        $results[] = "ok: {$sql}";
    } catch (PDOException $e) {
        if ($e->getCode() === '42S21') {
            $results[] = "skipped (already exists): {$sql}";
        } else {
            throw $e;
        }
    }
}

json_ok(['migrated' => true, 'results' => $results]);
