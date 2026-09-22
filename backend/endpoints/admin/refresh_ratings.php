<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/google_places.php';

// Explicit admin action, not a live/automatic fetch — the Places API is a
// paid, rate-limited external call per service/category, so refreshing only
// happens when an admin asks for it (see google_places.php's docblock).
$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();
$updated = 0;
$skipped = 0;

foreach (['services', 'categories'] as $table) {
    $ids = $pdo->query("SELECT id, google_place_id FROM {$table} WHERE google_place_id IS NOT NULL AND google_place_id != ''")
        ->fetchAll();
    foreach ($ids as $row) {
        $result = google_places_fetch_rating($row['google_place_id']);
        if ($result === null) {
            $skipped++;
            continue;
        }
        $pdo->prepare(
            "UPDATE {$table} SET google_rating = ?, google_rating_count = ?, google_rating_fetched_at = NOW() WHERE id = ?"
        )->execute([$result['rating'], $result['count'], $row['id']]);
        $updated++;
    }
}

json_ok(['updated' => $updated, 'skipped' => $skipped]);
