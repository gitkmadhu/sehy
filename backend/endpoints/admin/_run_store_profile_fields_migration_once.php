<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();

$statements = [
    "ALTER TABLE stores ADD COLUMN email VARCHAR(190) NULL AFTER website",
    "ALTER TABLE stores ADD COLUMN floor_unit VARCHAR(100) NULL AFTER email",
    "ALTER TABLE stores ADD COLUMN opening_hours VARCHAR(255) NULL AFTER floor_unit",
    "ALTER TABLE stores ADD COLUMN tagline VARCHAR(160) NULL AFTER opening_hours",
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
