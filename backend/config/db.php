<?php
function sehy_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // DigitalOcean App Platform auto-injects DATABASE_URL when a database is
    // attached (mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED) — parse
    // that first. Falls back to individual DB_HOST/DB_PORT/DB_NAME/DB_USER/
    // DB_PASSWORD env vars for setups that provide those instead, and finally
    // to the local XAMPP defaults for dev.
    $host = 'localhost';
    $port = '3306';
    $dbname = 'sehy';
    $user = 'root';
    $pass = '';
    $requireSsl = false;

    $databaseUrl = getenv('DATABASE_URL');
    if ($databaseUrl !== false && $databaseUrl !== '') {
        $parts = parse_url($databaseUrl);
        $host = $parts['host'] ?? $host;
        $port = isset($parts['port']) ? (string) $parts['port'] : $port;
        $dbname = isset($parts['path']) ? ltrim($parts['path'], '/') : $dbname;
        $user = $parts['user'] ?? $user;
        $pass = $parts['pass'] ?? $pass;
        // DigitalOcean's connection string host is never "localhost" — treat
        // any non-local DATABASE_URL as requiring an encrypted connection.
        $requireSsl = $host !== 'localhost' && $host !== '127.0.0.1';
    } else {
        $host = getenv('DB_HOST') !== false ? getenv('DB_HOST') : $host;
        $port = getenv('DB_PORT') !== false ? getenv('DB_PORT') : $port;
        $dbname = getenv('DB_NAME') !== false ? getenv('DB_NAME') : $dbname;
        $user = getenv('DB_USER') !== false ? getenv('DB_USER') : $user;
        $pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : $pass;
        $requireSsl = $host !== 'localhost' && $host !== '127.0.0.1';
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    if ($requireSsl) {
        // Verify against DigitalOcean's cluster CA cert when it's present
        // (download it from the database's Overview page, save as
        // backend/config/do-ca-certificate.crt — it's public, safe to commit).
        // Falls back to encrypted-but-unverified if the file isn't there yet,
        // so this doesn't break anything before that file is added.
        // PHP 8.5 renamed PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT to the
        // namespaced Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT (deprecation
        // warning otherwise on every request) — local dev still runs an
        // older PHP without the new class, so pick whichever exists.
        try {
            $verifyCertKey = constant('Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT');
        } catch (Throwable $e) {
            $verifyCertKey = PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT;
        }
        try {
            $sslCaKey = constant('Pdo\\Mysql::ATTR_SSL_CA');
        } catch (Throwable $e) {
            $sslCaKey = PDO::MYSQL_ATTR_SSL_CA;
        }

        $caPath = __DIR__ . '/do-ca-certificate.crt';
        if (is_readable($caPath)) {
            $options[$sslCaKey] = $caPath;
            $options[$verifyCertKey] = true;
        } else {
            $options[$verifyCertKey] = false;
        }
    }

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
        $user,
        $pass,
        $options
    );

    return $pdo;
}
