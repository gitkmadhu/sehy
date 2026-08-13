<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = gmls_db();
$stmt = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC');

json_ok(['categories' => $stmt->fetchAll()]);
