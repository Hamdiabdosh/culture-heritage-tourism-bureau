<?php
declare(strict_types=1);

namespace App;

/**
 * Double-submit CSRF: readable cookie + matching X-CSRF-Token header.
 * Required on mutating routes except login (no prior cookie guaranteed).
 */
final class Csrf
{
    public const COOKIE = 'egwp_csrf';
    public const HEADER = 'X-CSRF-Token';

    /** Ensure a CSRF cookie exists (call on every API request). */
    public static function touch(): void
    {
        $existing = $_COOKIE[self::COOKIE] ?? '';
        if (is_string($existing) && strlen($existing) >= 32) {
            return;
        }
        self::issue();
    }

    public static function issue(): string
    {
        $token = bin2hex(random_bytes(32));
        $config = Db::config();
        $sessionCfg = $config['session'] ?? [];
        setcookie(self::COOKIE, $token, [
            'expires' => time() + 60 * 60 * 24 * 30,
            'path' => $sessionCfg['path'] ?? '/',
            'secure' => (bool) ($sessionCfg['secure'] ?? false),
            'httponly' => false,
            'samesite' => $sessionCfg['samesite'] ?? 'Lax',
        ]);
        $_COOKIE[self::COOKIE] = $token;
        return $token;
    }

    public static function clear(): void
    {
        $config = Db::config();
        $sessionCfg = $config['session'] ?? [];
        setcookie(self::COOKIE, '', [
            'expires' => time() - 3600,
            'path' => $sessionCfg['path'] ?? '/',
            'secure' => (bool) ($sessionCfg['secure'] ?? false),
            'httponly' => false,
            'samesite' => $sessionCfg['samesite'] ?? 'Lax',
        ]);
        unset($_COOKIE[self::COOKIE]);
    }

    /** Reject request when header does not match cookie. */
    public static function requireValid(): void
    {
        $cookie = $_COOKIE[self::COOKIE] ?? '';
        $header = self::headerValue();
        if (
            !is_string($cookie)
            || $cookie === ''
            || $header === ''
            || !hash_equals($cookie, $header)
        ) {
            json_error(403, 'FORBIDDEN', 'Invalid CSRF token.');
        }
    }

    private static function headerValue(): string
    {
        $key = 'HTTP_X_CSRF_TOKEN';
        $raw = $_SERVER[$key] ?? '';
        return is_string($raw) ? trim($raw) : '';
    }
}
