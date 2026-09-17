<?php
require_once __DIR__ . '/../../lib/bootstrap.php';
require_once __DIR__ . '/../../lib/push.php';

$user = current_user();
require_role($user, ['admin', 'store_owner']);

$data = body();
require_fields($data, ['id', 'status']);

if (!in_array($data['status'], ['approved', 'rejected'], true)) {
    json_error('status must be approved or rejected', 422);
}

$pdo = gmls_db();

// A store manager (store_owner) may approve a pending offer submitted by
// their own store_staff — but never one they submitted themselves, same
// self-approval rule as store profile edits.
if ($user['role'] === 'store_owner') {
    $stmt = $pdo->prepare(
        'SELECT s.owner_id, o.submitted_by FROM offers o
         JOIN stores s ON s.id = o.store_id WHERE o.id = ?'
    );
    $stmt->execute([$data['id']]);
    $offerCheck = $stmt->fetch();
    if (!$offerCheck) {
        json_error('Offer not found', 404);
    }
    $isOwnStore = (int) $offerCheck['owner_id'] === (int) $user['id'];
    $submittedBySomeoneElse = $offerCheck['submitted_by'] !== null
        && (int) $offerCheck['submitted_by'] !== (int) $user['id'];
    if (!$isOwnStore || !$submittedBySomeoneElse) {
        json_error('Forbidden: you can only approve offers your own staff submitted', 403);
    }
}

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

if (is_admin($user)) {
    log_admin_action($user, 'offer.review', 'offer', $data['id'], ['status' => $data['status']]);
}

json_ok(['id' => (int) $data['id'], 'status' => $data['status']]);
