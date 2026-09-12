<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();
$stmt = $pdo->query('SELECT * FROM cities ORDER BY name ASC');

json_ok(['cities' => $stmt->fetchAll()]);
