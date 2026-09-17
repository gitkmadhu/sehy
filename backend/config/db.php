<?php
function gmls_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // DigitalOcean App Platform auto-injects DATABASE_URL when a database is
    // attached (mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED) — parse
    // that first. Falls back to individual DB_HOST/DB_PORT/DB_NAME/DB_USER/
    // DB_PASSWORD env vars for setups that provide those instead, and finally
    // to the local XAMPP defaults for dev.
    $host = 'localhost';
    $port = '3306';
    $dbname = 'gmls';
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
        // No bundled CA certificate yet — encrypts the connection without
        // strict certificate verification. Tighten this (PDO::MYSQL_ATTR_SSL_CA
        // pointed at DigitalOcean's downloaded cluster CA cert) once that's
        // in hand; encryption-in-transit still applies without it.
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
        $user,
        $pass,
        $options
    );

    return $pdo;
}
