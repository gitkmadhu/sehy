<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();
$stmt = $pdo->query('SELECT * FROM areas ORDER BY name ASC');

json_ok(['areas' => $stmt->fetchAll()]);
