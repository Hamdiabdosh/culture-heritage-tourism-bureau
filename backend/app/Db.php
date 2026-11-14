<?php
declare(strict_types=1);

namespace App;

use PDO;

final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $config = require dirname(__DIR__) . '/config/config.php';
        $db = $config['db'];
        try {
            self::$pdo = new PDO($db['dsn'], $db['user'], $db['pass'], $db['options'] ?? []);
            self::$pdo->exec("SET time_zone = '+00:00'");
        } catch (\PDOException $e) {
            json_error(500, 'DB', 'Database connection failed.');
        }
        return self::$pdo;
    }

    /** @return array<string, mixed> */
    public static function config(): array
    {
        static $config = null;
        if ($config === null) {
            $config = require dirname(__DIR__) . '/config/config.php';
        }
        return $config;
    }

    public static function institutionId(): string
    {
        $id = (string) (self::config()['institution_id'] ?? '');
        if ($id === '' || $id === 'CHANGE_ME_UUID') {
            json_error(500, 'CONFIG', 'institution_id is not configured.');
        }
        return $id;
    }
}
