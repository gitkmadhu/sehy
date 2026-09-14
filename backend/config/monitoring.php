<?php
// Shared secret required in the "Authorization" header of
// monitoring/health.php — generate any long random string yourself (e.g.
// `openssl rand -hex 32`) and give the same value to whatever external
// monitoring tool (Hermes Agent, or anything else) polls that endpoint.
// Leaving this as REPLACE_ME means health.php always rejects with 401.
const MONITORING_API_KEY = 'REPLACE_ME';
