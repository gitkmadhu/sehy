<?php
// TEMPORARY one-off endpoint — applies the same Mumbai/Thane/Navi Mumbai
// mall corrections and additions already run locally, to production.
// Not part of the app. super_admin-only. Delete after use.
require_once __DIR__ . '/../../lib/bootstrap.php';

$user = current_user();
require_role($user, ['super_admin']);

$pdo = gmls_db();

// Rename (from the first correction round)
$pdo->prepare("UPDATE malls SET name='Lake Shore Mall' WHERE name='Viviana Mall' AND city='Thane'")->execute();

// City corrections — production never received the interim wrong-city
// state these were fixed from locally, so Jio World Plaza/Drive simply
// never existed under Navi Mumbai here; nothing to UPDATE, just insert
// everything directly at its final correct city below.

$newMalls = [
    ['The Walk', 'Thane'], ['R Mall Thane', 'Thane'], ['R Mall Mulund', 'Thane'],
    ['LODHA Xperia Mall', 'Thane'], ['Sky City Mall', 'Thane'], ['Lake City Mall', 'Thane'],
    ['Lodha Boulevard', 'Thane'], ['High Street Mall', 'Thane'],
    ['Atria The Millennium Mall', 'Mumbai'], ['The Capital Mall', 'Mumbai'],
    ['Raghuleela Mega Mall Kandivali West', 'Mumbai'], ['Little World Mall', 'Mumbai'],
    ['Jio World Plaza', 'Mumbai'], ['Jio World Drive', 'Mumbai'],
    ["Growel's 101", 'Mumbai'], ['The Hub Mall', 'Mumbai'], ['Link Square Mall', 'Mumbai'],
    ['Neptune Magnet Mall', 'Mumbai'], ['K Star Mall', 'Mumbai'], ['Cubic Mall', 'Mumbai'],
    ['R Odeon Mall', 'Mumbai'],
    ['Raghuleela Mall Vashi', 'Navi Mumbai'], ['Palm Beach Galleria Mall', 'Navi Mumbai'],
    ['Center One Mall', 'Navi Mumbai'], ['Haware Centurion Mall', 'Navi Mumbai'],
    ['Glomax Mall', 'Navi Mumbai'], ['Orion Mall', 'Navi Mumbai'],
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
