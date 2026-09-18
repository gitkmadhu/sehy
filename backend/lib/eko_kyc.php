<?php
require_once __DIR__ . '/../config/eko.php';

/**
 * Eko's documented signing recipe: HMAC-SHA256 of the current Unix
 * timestamp in MILLISECONDS (as a string), keyed by EKO_ACCESS_KEY used
 * as-is (a string — do NOT base64-decode it first, that produces a
 * different signature and a 403), base64-encoded.
 */
function eko_secret_key(): string {
    $timestampMs = (string) round(microtime(true) * 1000);
    return base64_encode(hash_hmac('sha256', $timestampMs, EKO_ACCESS_KEY, true));
}

/**
 * POSTs to an Eko endpoint and returns the decoded JSON response, or null
 * on any failure (not configured, network error, non-200) — callers treat
 * null as "couldn't verify right now", never a hard error, since this is
 * a best-effort enrichment on top of the free checksum/format checks that
 * already gate submission.
 */
function eko_request(string $path, array $body): ?array {
    if (EKO_DEVELOPER_KEY === '' || EKO_ACCESS_KEY === '') {
        return null;
    }

    $ch = curl_init(EKO_BASE_URL . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'developer_key: ' . EKO_DEVELOPER_KEY,
            'secret-key: ' . eko_secret_key(),
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 15,
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
 * Verifies a GSTIN against the real GST registry. Returns
 * ['status' => ..., 'legal_name' => ...] on success, or null if
 * unconfigured/unreachable/not found.
 */
function verify_gstin_registry(string $gstin): ?array {
    $data = eko_request('/tools/kyc/gstin', ['Gstin' => $gstin]);
    if ($data === null || empty($data['GSTIN Status'])) {
        return null;
    }
    return [
        'status' => $data['GSTIN Status'],
        'legal_name' => $data['Legal Name Of Business'] ?? null,
    ];
}

/**
 * Verifies a PAN against the real registry. Returns
 * ['status' => ..., 'registered_name' => ...] on success, or null.
 *
 * NOT YET CONFIRMED against a real response — Eko's clearly-documented
 * "PAN Lite" endpoint expects an individual's name+DOB for a match check,
 * which doesn't fit a business/company PAN (no DOB). This calls the
 * plainer "fetch-pan" endpoint instead (no DOB required), but its exact
 * response field names are a best guess from documentation, not a
 * confirmed real response. Adjust the two array keys below against a
 * real sandbox call before trusting this for anything.
 */
function verify_pan_registry(string $pan): ?array {
    $data = eko_request('/tools/kyc/fetch-pan', ['pan_number' => $pan]);
    if ($data === null) {
        return null;
    }
    return [
        'status' => $data['status'] ?? $data['pan_status'] ?? null,
        'registered_name' => $data['name'] ?? $data['registered_name'] ?? null,
    ];
}
