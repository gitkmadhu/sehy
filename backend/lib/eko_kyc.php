<?php
require_once __DIR__ . '/../config/eko.php';

/**
 * The REAL signing recipe, taken from Eko's own official Postman
 * collection's pre-request script (authoritative — supersedes the
 * doc-scraped version this file originally had):
 *
 *   const ts = Date.now().toString();
 *   const encodedKey = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(accessKey));
 *   const sig = CryptoJS.HmacSHA256(ts, encodedKey);
 *   secret-key = CryptoJS.enc.Base64.stringify(sig);
 *   secret-key-timestamp = ts;
 *
 * Two things this corrects from the original doc-based guess: (1) the
 * RAW access key gets base64-encoded first, and THAT resulting base64
 * *string* is used as the HMAC key material (not the raw access key
 * bytes directly) — `base64_encode(EKO_ACCESS_KEY)` mirrors
 * `Base64.stringify(Utf8.parse(accessKey))` exactly, since PHP strings
 * are already raw bytes. (2) There's a third header, `secret-key-
 * timestamp`, carrying the same timestamp used in the signature — Eko's
 * server presumably re-derives the signature from it and compares.
 */
function eko_secret_key_pair(): array {
    $timestampMs = (string) round(microtime(true) * 1000);
    $encodedKey = base64_encode(EKO_ACCESS_KEY);
    $secretKey = base64_encode(hash_hmac('sha256', $timestampMs, $encodedKey, true));
    return ['secret_key' => $secretKey, 'timestamp' => $timestampMs];
}

/**
 * Generates a client_ref_id — Eko requires one per non-GET call, max 20
 * chars, unique per call. A millisecond timestamp (13 digits) comfortably
 * fits and is unique enough for this app's low call volume (admin-
 * triggered, one at a time — see verify_kyc.php).
 */
function eko_client_ref_id(): string {
    return (string) round(microtime(true) * 1000);
}

/**
 * POSTs to an Eko endpoint and returns the decoded JSON response, or null
 * on any failure (not configured, network error, non-200) — callers treat
 * null as "couldn't verify right now", never a hard error, since this is
 * a best-effort enrichment on top of the free checksum/format checks that
 * already gate submission. Automatically injects initiator_id and
 * client_ref_id, which every Eko endpoint requires — callers only need to
 * pass the fields specific to what they're calling.
 */
function eko_request(string $path, array $body): ?array {
    if (EKO_DEVELOPER_KEY === '' || EKO_ACCESS_KEY === '' || EKO_INITIATOR_ID === '') {
        return null;
    }

    $keyPair = eko_secret_key_pair();
    $fullBody = array_merge([
        'initiator_id' => EKO_INITIATOR_ID,
        'client_ref_id' => eko_client_ref_id(),
    ], $body);

    $ch = curl_init(EKO_BASE_URL . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_HTTPHEADER => [
            'content-type: application/json',
            'developer_key: ' . EKO_DEVELOPER_KEY,
            'secret-key: ' . $keyPair['secret_key'],
            'secret-key-timestamp: ' . $keyPair['timestamp'],
        ],
        CURLOPT_POSTFIELDS => json_encode($fullBody),
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
 * Verifies a GSTIN against the real GST registry, cross-referenced
 * against $businessName (required by Eko's API — the submitted service/
 * category name). Returns ['status' => ..., 'legal_name' => ...] on success,
 * or null if unconfigured/unreachable/not found/verification_failed.
 *
 * Response field names for a *successful* verification are NOT YET
 * CONFIRMED against a real response — every real sandbox call made so
 * far returned "verification_failed" (sandbox likely only recognizes
 * specific dummy test GSTINs, not real ones). Re-check these field names
 * against an actual successful response before trusting this.
 */
function verify_gstin_registry(string $gstin, string $businessName): ?array {
    $data = eko_request('/tools/kyc/gstin', ['gstin' => $gstin, 'business_name' => $businessName]);
    if ($data === null || ($data['code'] ?? null) !== 'success') {
        return null;
    }
    return [
        'status' => $data['GSTIN Status'] ?? $data['gstin_status'] ?? $data['status'] ?? null,
        'legal_name' => $data['Legal Name Of Business'] ?? $data['legal_name'] ?? $data['business_name'] ?? null,
    ];
}

/**
 * Verifies a PAN against the real registry. Returns
 * ['status' => ..., 'registered_name' => ...] on success, or null.
 *
 * NOT YET CONFIRMED against a real response — same caveat as GST above,
 * plus the endpoint path/params here are still a best guess from
 * documentation (unlike GST, this hasn't been test-called against the
 * real sandbox yet). Confirm the path and request/response shape for
 * real before trusting this.
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
