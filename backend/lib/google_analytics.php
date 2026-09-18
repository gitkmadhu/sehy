<?php
require_once __DIR__ . '/../config/analytics.php';

/** Base64url-encodes (no padding) — the encoding JWTs use, distinct from plain base64. */
function ga_base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Exchanges the service account's JSON key for a short-lived OAuth access
 * token, via the standard JWT-bearer grant. Returns null (never throws) if
 * the key file is missing/unreadable or Google's token endpoint rejects the
 * request — callers treat null as "analytics isn't connected yet" rather
 * than a hard error, since that's the expected state until the one-time
 * Google Cloud/GA setup is done.
 */
function ga_get_access_token(): ?string {
    if (!is_readable(GA_SERVICE_ACCOUNT_KEY_PATH)) {
        return null;
    }
    $key = json_decode(file_get_contents(GA_SERVICE_ACCOUNT_KEY_PATH), true);
    if (!isset($key['client_email'], $key['private_key'])) {
        return null;
    }

    $now = time();
    $header = ga_base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claims = ga_base64url(json_encode([
        'iss' => $key['client_email'],
        'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ]));

    $signature = '';
    $signed = openssl_sign("{$header}.{$claims}", $signature, $key['private_key'], OPENSSL_ALGO_SHA256);
    if (!$signed) {
        return null;
    }
    $jwt = "{$header}.{$claims}." . ga_base64url($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status !== 200) {
        return null;
    }
    $decoded = json_decode($response, true);
    return $decoded['access_token'] ?? null;
}

/**
 * POSTs a runReport request to the GA4 Data API and returns the decoded
 * response, or null on any failure (no token, missing property ID, non-200
 * response) — shared by ga_run_report() (one mall/store, dimension-filtered)
 * and ga_run_platform_report() (every mall/store, unfiltered) below, which
 * differ only in whether $dimensionFilter is set.
 */
function ga_run_report_request(array $metrics, int $days, ?array $dimensionFilter): ?array {
    if (GA_PROPERTY_ID === '') {
        return null;
    }
    $token = ga_get_access_token();
    if ($token === null) {
        return null;
    }

    $payload = [
        'dateRanges' => [['startDate' => "{$days}daysAgo", 'endDate' => 'today']],
        'dimensions' => [['name' => 'date']],
        'metrics' => array_map(fn($m) => ['name' => $m], $metrics),
        'orderBys' => [['dimension' => ['dimensionName' => 'date']]],
    ];
    if ($dimensionFilter !== null) {
        $payload['dimensionFilter'] = ['filter' => $dimensionFilter];
    }

    $ch = curl_init("https://analyticsdata.googleapis.com/v1beta/properties/" . GA_PROPERTY_ID . ":runReport");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer {$token}",
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false || $status !== 200) {
        return null;
    }
    return json_decode($response, true);
}

/**
 * Runs a GA4 report for one mall or store, filtered by an event-scoped
 * custom dimension (mall_id or store_id — must already be registered as
 * an event parameter under the matching name in the GA4 property's
 * Admin > Custom definitions). GA4's Data API addresses event-scoped
 * custom dimensions as "customEvent:{parameter_name}" in both the
 * dimensions list and dimensionFilter — callers here still pass the
 * plain name (e.g. 'mall_id'), this is the one place that knows the
 * required prefix. Returns null on any failure — see
 * ga_run_report_request().
 */
function ga_run_report(string $dimensionIdName, string $dimensionIdValue, array $metrics, int $days = 30): ?array {
    return ga_run_report_request($metrics, $days, [
        'fieldName' => "customEvent:{$dimensionIdName}",
        'stringFilter' => ['value' => $dimensionIdValue],
    ]);
}

/**
 * Runs the same GA4 report platform-wide (no mall_id/store_id filter) — for
 * the admin Analytics dashboard's overall summary. Returns null on any
 * failure — see ga_run_report_request().
 */
function ga_run_platform_report(array $metrics, int $days = 30): ?array {
    return ga_run_report_request($metrics, $days, null);
}
