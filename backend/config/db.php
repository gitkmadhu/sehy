<?php
function gmls_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Local XAMPP defaults below. In production, set DB_HOST/DB_PORT/DB_NAME/
    // DB_USER/DB_PASSWORD as environment variables — e.g. on DigitalOcean App
    // Platform, bind each to the attached managed database's ${db.HOSTNAME},
    // ${db.PORT}, ${db.DATABASE}, ${db.USERNAME}, ${db.PASSWORD}.
    $host = getenv('DB_HOST') !== false ? getenv('DB_HOST') : 'localhost';
    $port = getenv('DB_PORT') !== false ? getenv('DB_PORT') : '3306';
    $dbname = getenv('DB_NAME') !== false ? getenv('DB_NAME') : 'gmls';
    $user = getenv('DB_USER') !== false ? getenv('DB_USER') : 'root';
    $pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '';

    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    return $pdo;
}
