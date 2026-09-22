<?php
// Eko Platform Services (EPS) — paid GST/PAN registry verification, called
// on demand from admin/verify_kyc.php (never automatically at service/category
// submission time — see that file's own comment for why).
//
// Sign up at https://eps.eko.in (self-serve, sandbox credentials issued
// immediately). EKO_DEVELOPER_KEY and EKO_ACCESS_KEY come from their
// developer console. Leaving EKO_DEVELOPER_KEY empty disables verification
// entirely — verify_kyc.php returns a "not configured yet" response
// instead of erroring, same pattern as every other integration this
// project uses (GA4, Slack, Maps).
//
// EKO_INITIATOR_ID is the registered mobile number of the Eko API user
// (see their dashboard's "Platform Credentials" page) — every request
// requires this, distinct from the developer/access keys.
//
// EKO_BASE_URL defaults to their SANDBOX host on purpose — going live
// (and spending real money) requires deliberately setting this env var to
// the production host too, not just adding real keys.
define('EKO_DEVELOPER_KEY', getenv('EKO_DEVELOPER_KEY') !== false ? getenv('EKO_DEVELOPER_KEY') : '');
define('EKO_ACCESS_KEY', getenv('EKO_ACCESS_KEY') !== false ? getenv('EKO_ACCESS_KEY') : '');
define('EKO_INITIATOR_ID', getenv('EKO_INITIATOR_ID') !== false ? getenv('EKO_INITIATOR_ID') : '');
define('EKO_BASE_URL', getenv('EKO_BASE_URL') !== false ? getenv('EKO_BASE_URL') : 'https://staging.eko.in/ekoapi/v3');
