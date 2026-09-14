<?php
require_once __DIR__ . '/../config/slack.php';

/**
 * Business-level incidents (payment failures, banner publish failures, new
 * signups, failed logins, RevenueCat webhook failures, etc.) — distinct from
 * lib/error_logging.php's errors.log, which is for uncaught PHP
 * exceptions/warnings. Stored in the `incidents` table rather than a flat
 * log so status/root_cause/corrective_action can be edited later from the
 * admin Incidents tab.
 *
 * $dedupeKey, when given, collapses repeats of the same underlying problem
 * (e.g. the same email failing to log in) into one open row instead of a new
 * incident per occurrence — mirroring how scripts/health_alert only alerts
 * on a status *change*. Only the first occurrence posts to Slack; repeats
 * just bump `occurrences` silently.
 */
function record_incident(
    string $type,
    string $severity,
    array $context = [],
    ?string $dedupeKey = null,
    int $dedupeWindowMinutes = 30
): void {
    try {
        $pdo = gmls_db();

        if ($dedupeKey !== null) {
            $stmt = $pdo->prepare(
                "SELECT id FROM incidents
                 WHERE type = ? AND dedupe_key = ? AND status != 'resolved'
                   AND last_seen_at >= (NOW() - INTERVAL ? MINUTE)
                 ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute([$type, $dedupeKey, $dedupeWindowMinutes]);
            $existingId = $stmt->fetchColumn();

            if ($existingId) {
                $pdo->prepare(
                    'UPDATE incidents SET occurrences = occurrences + 1, last_seen_at = NOW(), context = ? WHERE id = ?'
                )->execute([json_encode($context), $existingId]);
                return;
            }
        }

        $pdo->prepare(
            'INSERT INTO incidents (type, severity, dedupe_key, context, first_seen_at, last_seen_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())'
        )->execute([$type, $severity, $dedupeKey, json_encode($context)]);
    } catch (Throwable $e) {
        // Recording an incident must never itself break the request that triggered it.
        return;
    }

    // 'info' events (e.g. a new member joining) stay visible in the admin
    // tab without pinging Slack for routine, high-volume activity.
    if ($severity !== 'info') {
        post_incident_to_slack($type, $severity, $context);
    }
}

function post_incident_to_slack(string $type, string $severity, array $context): void {
    if (SLACK_INCIDENTS_WEBHOOK_URL === 'REPLACE_ME') {
        return;
    }

    $emoji = $severity === 'critical' ? '🚨' : '⚠️';
    $lines = ["{$emoji} New incident: *{$type}* ({$severity})"];
    foreach ($context as $key => $value) {
        if (is_scalar($value)) {
            $lines[] = "{$key}: {$value}";
        }
    }

    $ch = curl_init(SLACK_INCIDENTS_WEBHOOK_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['text' => implode("\n", $lines)]),
        CURLOPT_TIMEOUT => 5,
    ]);
    @curl_exec($ch);
    curl_close($ch);
}
