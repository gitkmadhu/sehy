<?php
require_once __DIR__ . '/../../lib/bootstrap.php';

// Only services/categories that have a Google Place ID on file are listed — nothing
// to rate otherwise. Sorted by rating descending; rows with no successful
// fetch yet (NULL rating) sort last regardless of direction.
$user = current_user();
require_role($user, ['admin']);

$pdo = sehy_db();

$services = $pdo->query(
    "SELECT id, name, area, google_rating, google_rating_count, google_rating_fetched_at
     FROM services
     WHERE google_place_id IS NOT NULL AND google_place_id != ''
     ORDER BY google_rating IS NULL, google_rating DESC"
)->fetchAll();

$categories = $pdo->query(
    "SELECT id, name, area, google_rating, google_rating_count, google_rating_fetched_at
     FROM categories
     WHERE google_place_id IS NOT NULL AND google_place_id != ''
     ORDER BY google_rating IS NULL, google_rating DESC"
)->fetchAll();

json_ok(['services' => $services, 'categories' => $categories]);
