<?php 
function db()
{
    static $pdo;
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS, $DB_CHARSET;
    if (!$pdo) {
        $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset={$DB_CHARSET}";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
