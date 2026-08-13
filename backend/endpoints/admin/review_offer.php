<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/push.php';

$user = current_user();
require_role($user, ['admin']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}

$pdo = gmls_db();
$pdo->prepare('UPDATE offers SET status = ? WHERE id = ?')
    ->execute([$data['status'], $data['id']]);

if ($data['status'] === 'approved') {
    $stmt = $pdo->prepare(
        'SELECT o.title, s.name AS store_name FROM offers o
         JOIN stores s ON s.id = o.store_id WHERE o.id = ?'
    );
    $stmt->execute([$data['id']]);
    $offer = $stmt->fetch();

    if ($offer) {
        broadcast_push(
            "New offer at {$offer['store_name']}",
            $offer['title'],
            ['offer_id' => (string) $data['id']]
        );
        $pdo->prepare('INSERT INTO notifications (offer_id, title, body) VALUES (?, ?, ?)')
            ->execute([$data['id'], "New offer at {$offer['store_name']}", $offer['title']]);
    }
}

json_ok(['id' => (int) $data['id'], 'status' => $data['status']]);
