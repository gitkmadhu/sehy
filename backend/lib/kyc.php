<?php
/**
 * Free-tier-only KYC checks — format/checksum validation and phone-liveness
 * verification, no paid third-party registry lookup. See
 * docs/kyc-verification (plan) for the fuller rationale: GST/PAN registry
 * lookup and mall-store allocation proof have no free API, so this only
 * catches obvious typos/fakes before a submission reaches admin review —
 * it does not replace that manual review.
 */

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The standard published GSTIN check-digit algorithm (Luhn-mod-36 over the
 * 36-char alphanumeric alphabet, alternating factor 1/2 by position).
 * Verified against a real GSTIN (33AAACC1206D1ZN) during development —
 * this is NOT a guess, but this alone still only proves the number is
 * *well-formed*, not that it's currently registered/active.
 */
function gstin_checksum_valid(string $gstin): bool {
    if (strlen($gstin) !== 15) {
        return false;
    }
    $sum = 0;
    for ($i = 0; $i < 14; $i++) {
        $value = strpos(GSTIN_CHARSET, $gstin[$i]);
        if ($value === false) {
            return false;
        }
        $factor = ($i % 2 === 0) ? 1 : 2;
        $product = $value * $factor;
        $sum += intdiv($product, 36) + ($product % 36);
    }
    $expected = GSTIN_CHARSET[(36 - ($sum % 36)) % 36];
    return $gstin[14] === $expected;
}

/**
 * json_error(...)'s on anything but a well-formed, checksum-valid GSTIN;
 * otherwise returns it normalized (trimmed, uppercased) for storage.
 */
function validate_gstin_or_fail(string $gstin): string {
    $gstin = strtoupper(trim($gstin));
    if (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', $gstin)) {
        json_error('Enter a valid 15-character GSTIN', 422);
    }
    if (!gstin_checksum_valid($gstin)) {
        json_error('That GSTIN failed the checksum check — please re-check it', 422);
    }
    return $gstin;
}

/**
 * PAN has no public checksum digit (unlike GSTIN) — this is format/shape
 * validation only (5 letters, 4 digits, 1 letter) and catches typos, not
 * fake-but-well-formed numbers. Returns it normalized on success.
 */
function validate_pan_or_fail(string $pan): string {
    $pan = strtoupper(trim($pan));
    if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/', $pan)) {
        json_error('Enter a valid 10-character PAN', 422);
    }
    return $pan;
}
