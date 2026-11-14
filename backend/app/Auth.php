<?php
declare(strict_types=1);

namespace App;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

/**
 * Cookie session auth. Passwords: password_verify (bcrypt/argon).
 * Better Auth scrypt verify is a later migration path — greenfield seed uses password_hash.
 */
final class Auth
{
    /** @return array{id:string,name:string,email:string,role:string,active:int}|null */
    public static function user(): ?array
    {
        $config = Db::config();
        $cookieName = $config['session']['cookie_name'] ?? 'egwp_session';
        $raw = $_COOKIE[$cookieName] ?? '';
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $hash = hash('sha256', $raw);
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.email, u.role, u.active, s.id AS session_id, s.expires_at
             FROM session s
             INNER JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = :h
             LIMIT 1',
        );
        $stmt->execute(['h' => $hash]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        if ((int) $row['active'] !== 1) {
            self::destroySession((string) $row['session_id'], $cookieName);
            return null;
        }

        $expires = new DateTimeImmutable((string) $row['expires_at'], new DateTimeZone('UTC'));
        if ($expires < new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
            self::destroySession((string) $row['session_id'], $cookieName);
            return null;
        }

        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'role' => (string) $row['role'],
            'active' => (int) $row['active'],
        ];
    }

    public static function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        if ($email === '' || $password === '') {
            json_error(400, 'VALIDATION', 'Email and password are required.');
        }

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT u.id, u.name, u.email, u.role, u.active, a.password
             FROM users u
             INNER JOIN account a ON a.user_id = u.id AND a.provider_id = \'credential\'
             WHERE u.email = :email
             LIMIT 1',
        );
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();

        if (!$row || empty($row['password']) || !password_verify($password, (string) $row['password'])) {
            json_error(401, 'UNAUTHORIZED', 'Invalid email or password.');
        }

        if ((int) $row['active'] !== 1) {
            json_error(403, 'FORBIDDEN', 'This account is inactive. Contact an administrator.');
        }

        // Rehash legacy/outdated algorithms on successful login when PHP can.
        if (password_needs_rehash((string) $row['password'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $upd = $pdo->prepare('UPDATE account SET password = :p WHERE user_id = :u AND provider_id = \'credential\'');
            $upd->execute(['p' => $newHash, 'u' => $row['id']]);
        }

        self::createSession((string) $row['id']);
        Csrf::issue();

        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'role' => (string) $row['role'],
        ];
    }

    public static function logout(): void
    {
        $config = Db::config();
        $cookieName = $config['session']['cookie_name'] ?? 'egwp_session';
        $raw = $_COOKIE[$cookieName] ?? '';
        if (is_string($raw) && $raw !== '') {
            $hash = hash('sha256', $raw);
            $pdo = Db::pdo();
            $stmt = $pdo->prepare('DELETE FROM session WHERE token_hash = :h');
            $stmt->execute(['h' => $hash]);
        }
        self::clearCookie($cookieName);
        Csrf::clear();
    }

    private static function createSession(string $userId): void
    {
        $config = Db::config();
        $sessionCfg = $config['session'] ?? [];
        $cookieName = $sessionCfg['cookie_name'] ?? 'egwp_session';
        $ttlHours = (int) ($sessionCfg['ttl_hours'] ?? 168);

        $token = bin2hex(random_bytes(32));
        $hash = hash('sha256', $token);
        $id = self::uuid();
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $expires = $now->add(new DateInterval('PT' . max(1, $ttlHours) . 'H'));

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO session (id, user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES (:id, :uid, :th, :exp, :ip, :ua)',
        );
        $stmt->execute([
            'id' => $id,
            'uid' => $userId,
            'th' => $hash,
            'exp' => $expires->format('Y-m-d H:i:s.v'),
            'ip' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64) ?: null,
            'ua' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512) ?: null,
        ]);

        $secure = (bool) ($sessionCfg['secure'] ?? false);
        setcookie($cookieName, $token, [
            'expires' => $expires->getTimestamp(),
            'path' => $sessionCfg['path'] ?? '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sessionCfg['samesite'] ?? 'Lax',
        ]);
        $_COOKIE[$cookieName] = $token;
    }

    private static function destroySession(string $sessionId, string $cookieName): void
    {
        $pdo = Db::pdo();
        $stmt = $pdo->prepare('DELETE FROM session WHERE id = :id');
        $stmt->execute(['id' => $sessionId]);
        self::clearCookie($cookieName);
    }

    private static function clearCookie(string $cookieName): void
    {
        $config = Db::config();
        $sessionCfg = $config['session'] ?? [];
        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => $sessionCfg['path'] ?? '/',
            'secure' => (bool) ($sessionCfg['secure'] ?? false),
            'httponly' => true,
            'samesite' => $sessionCfg['samesite'] ?? 'Lax',
        ]);
        unset($_COOKIE[$cookieName]);
    }

    private static function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        $h = bin2hex($b);
        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($h, 0, 8),
            substr($h, 8, 4),
            substr($h, 12, 4),
            substr($h, 16, 4),
            substr($h, 20, 12),
        );
    }
}
