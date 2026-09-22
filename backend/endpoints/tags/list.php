<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$pdo = sehy_db();
$stmt = $pdo->query('SELECT * FROM tags ORDER BY sort_order ASC');

json_ok(['tags' => $stmt->fetchAll()]);
