<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id']);

$pdo = gmls_db();
$pdo->prepare('DELETE FROM malls WHERE id = ?')->execute([$data['id']]);

json_ok(['deleted' => true]);
