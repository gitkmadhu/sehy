<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();

$statements = [
    "ALTER TABLE users ADD COLUMN mobile_verified_at DATETIME NULL AFTER phone",
    "ALTER TABLE malls ADD COLUMN gstin VARCHAR(15) NULL AFTER email_domain",
    "ALTER TABLE malls ADD COLUMN pan VARCHAR(10) NULL AFTER gstin",
    "ALTER TABLE stores ADD COLUMN gstin VARCHAR(15) NULL AFTER address",
    "ALTER TABLE stores ADD COLUMN pan VARCHAR(10) NULL AFTER gstin",
    "ALTER TABLE stores ADD COLUMN allocation_proof_url VARCHAR(255) NULL AFTER pan",
];

$results = [];
foreach ($statements as $sql) {
    try {
        $pdo->exec($sql);
        $results[] = "ok: {$sql}";
    } catch (PDOException $e) {
        // 42S21 = "Duplicate column name" — safe to re-run.
        if ($e->getCode() === '42S21') {
            $results[] = "skipped (already exists): {$sql}";
        } else {
            throw $e;
        }
    }
}

json_ok(['migrated' => true, 'results' => $results]);
