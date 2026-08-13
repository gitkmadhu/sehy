<?php
// Fill in with your Firebase project's server key (Firebase console > Project settings > Cloud Messaging).
// FCM is used purely as a push-delivery transport; all app data stays in MySQL.
const FCM_SERVER_KEY = '';

/** Sends a push notification to every user with a saved fcm_token. Silently no-ops if FCM_SERVER_KEY is unset. */
function broadcast_push(string $title, string $body, array $data = []): void {
    if (FCM_SERVER_KEY === '') {
        return;
    }

    $pdo = gmls_db();
    $tokens = $pdo->query(
        "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ''"
    )->fetchAll(PDO::FETCH_COLUMN);

    foreach (array_chunk($tokens, 500) as $batch) {
        $payload = [
            'registration_ids' => $batch,
            'notification' => ['title' => $title, 'body' => $body],
            'data' => $data,
        ];

        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: key=' . FCM_SERVER_KEY,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
