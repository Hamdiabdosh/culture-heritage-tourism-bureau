<?php
declare(strict_types=1);

/**
 * @param array<string, string> $data
 */
function json_response(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $code, string $message): never
{
    json_response($status, [
        'error' => [
            'code' => $code,
            'message' => $message,
        ],
    ]);
}

function not_implemented(string $endpoint): never
{
    json_error(501, 'NOT_IMPLEMENTED', $endpoint . ' is not implemented yet.');
}

/** @return array<string, mixed> */
function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error(400, 'VALIDATION', 'Invalid JSON body.');
    }
    return $data;
}

function iso_utc(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    try {
        $dt = new DateTimeImmutable($value, new DateTimeZone('UTC'));
        return $dt->format('Y-m-d\TH:i:s.v\Z');
    } catch (Throwable) {
        return $value;
    }
}

/**
 * Match /cms/pages/{id} style patterns. Returns param map or null.
 *
 * @return array<string, string>|null
 */
function normalize_slug(string $raw): string
{
    $slug = strtolower(trim($raw));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

function is_valid_slug(string $slug): bool
{
    return (bool) preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug);
}

function uuid_v4(): string
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

/** @return 'draft'|'published'|'archived' */
function require_content_status(mixed $value): string
{
    $status = (string) ($value ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'archived'], true)) {
        json_error(400, 'VALIDATION', 'Invalid status.');
    }
    return $status;
}

function is_duplicate_key(PDOException $e): bool
{
    return $e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate');
}

/**
 * datetime-local → UTC DATETIME(3). Bare local values treated as Africa/Addis_Ababa (UTC+3).
 */
function parse_event_date_utc(string $raw): string
{
    $raw = trim($raw);
    if ($raw === '') {
        json_error(400, 'VALIDATION', 'Event date is required.');
    }

    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/', $raw, $m)) {
        $asIfUtc = gmmktime(
            (int) $m[4],
            (int) $m[5],
            (int) ($m[6] ?? 0),
            (int) $m[2],
            (int) $m[3],
            (int) $m[1],
        );
        // EAT wall clock → UTC instant (EAT = UTC+3, no DST).
        $utc = $asIfUtc - (3 * 3600);
        return gmdate('Y-m-d H:i:s', $utc) . '.000';
    }

    try {
        $dt = new DateTimeImmutable($raw);
        return $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    } catch (Throwable) {
        json_error(400, 'VALIDATION', 'Event date is invalid.');
    }
}

function is_allowed_document_file_url(string $value): bool
{
    if ($value === '') {
        return true;
    }
    if (str_starts_with($value, '//')) {
        return false;
    }
    if (str_starts_with($value, '/')) {
        return true;
    }
    $parts = parse_url($value);
    if ($parts === false || !isset($parts['scheme'])) {
        return false;
    }
    $scheme = strtolower((string) $parts['scheme']);
    return $scheme === 'http' || $scheme === 'https';
}

function match_route(string $pattern, string $path): ?array
{
    $pattern = '/' . trim($pattern, '/');
    if ($pattern !== '/') {
        $pattern = rtrim($pattern, '/') ?: '/';
    }

    $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
    if ($regex === null) {
        return null;
    }
    $regex = '#^' . $regex . '$#';

    if (!preg_match($regex, $path, $matches)) {
        return null;
    }

    $params = [];
    foreach ($matches as $key => $value) {
        if (is_string($key)) {
            $params[$key] = $value;
        }
    }
    return $params;
}
