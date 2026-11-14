<?php
declare(strict_types=1);

/**
 * Copy to config.php on the host (deny web access). Do not commit secrets.
 *
 * DSN placeholders for MySQL PDO — schema owned by Agent A.
 */
return [
    'db' => [
        'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=egwp;charset=utf8mb4',
        'user' => 'CHANGE_ME',
        'pass' => 'CHANGE_ME',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ],
    ],
    'institution_id' => 'CHANGE_ME_UUID',
    'public_origin' => 'https://www.example.gov.et',
    'uploads_dir' => __DIR__ . '/../storage/uploads',
    'session' => [
        'cookie_name' => 'egwp_session',
        'secure' => true, // HTTPS production
        'samesite' => 'Lax',
        'path' => '/',
        'ttl_hours' => 168,
    ],
];
