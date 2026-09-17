<?php
// TEMPORARY one-off endpoint — adds 3 high-confidence missing malls
// identified during a review, already verified locally. Not part of the
// app. super_admin-only. Delete after use.
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();
$newMalls = [
    ['Garuda Mall', 'Bengaluru'],
    ['Chennai Citi Centre', 'Chennai'],
    ['Forum Mall (Elgin Road)', 'Kolkata'],
];

$added = 0;
$skipped = 0;
foreach ($newMalls as [$mallName, $cityName]) {
    $stmt = $pdo->prepare('SELECT id FROM malls WHERE name = ? AND city = ?');
    $stmt->execute([$mallName, $cityName]);
    if ($stmt->fetch()) {
        $skipped++;
        continue;
    }
    $pdo->prepare("INSERT INTO malls (name, city, status) VALUES (?, ?, 'approved')")->execute([$mallName, $cityName]);
    $added++;
}

json_ok(['malls_added' => $added, 'malls_skipped' => $skipped]);
