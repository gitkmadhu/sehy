<?php
/**
 * Audit trail for admin/super_admin actions — category/area/rate-card
 * management, approvals. Distinct from lib/incidents.php (business-level
 * failures) and lib/error_logging.php (PHP exceptions): this is "who did
 * what", not "what went wrong". Never called for routine self-service
 * actions by category_manager/service_owner/staff on their own resources.
 */
function log_admin_action(array $user, string $action, ?string $targetType = null, $targetId = null, array $details = []): void {
    try {
        $pdo = sehy_db();
        $pdo->prepare(
            'INSERT INTO admin_activity_log (user_id, user_name, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$user['id'], $user['name'], $action, $targetType, $targetId, json_encode($details)]);
    } catch (Throwable $e) {
        // Logging an action must never break the action itself.
        try {
            log_error('warning', 'log_admin_action failed: ' . $e->getMessage(), ['action' => $action]);
        } catch (Throwable $e2) {
            // give up quietly
        }
    }
}
