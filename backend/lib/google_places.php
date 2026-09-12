<?php
require_once __DIR__ . '/../config/google_places.php';

/**
 * Fetches a place's current rating from the Places API's Place Details
 * endpoint. Returns ['rating' => float, 'count' => int] or null on any
 * failure (no key configured, network error, place not found, no rating
 * data yet) — callers treat null as "not connected/not rated" rather than
 * a hard error, same contract as ga_run_report() in google_analytics.php.
 */
function google_places_fetch_rating(string $placeId): ?array {
    if (GOOGLE_PLACES_API_KEY === '') {
        return null;
    }

    $url = 'https://maps.googleapis.com/maps/api/place/details/json?' . http_build_query([
        'place_id' => $placeId,
        'fields' => 'rating,user_ratings_total',
        'key' => GOOGLE_PLACES_API_KEY,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status !== 200) {
        return null;
    }
    $decoded = json_decode($response, true);
    if (($decoded['status'] ?? '') !== 'OK' || !isset($decoded['result']['rating'])) {
        return null;
    }

    return [
        'rating' => (float) $decoded['result']['rating'],
        'count' => (int) ($decoded['result']['user_ratings_total'] ?? 0),
    ];
}
