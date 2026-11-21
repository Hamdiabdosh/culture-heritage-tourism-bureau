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

/** Public `?lang=` → en|am|om|ha (unknown → en). */
function request_lang(): string
{
    $raw = strtolower(trim((string) ($_GET['lang'] ?? 'en')));
    return in_array($raw, ['en', 'am', 'om', 'ha'], true) ? $raw : 'en';
}

/** Trimmed text with tags + control chars removed; 400 when over $maxLen. */
function plain_text(mixed $raw, int $maxLen, string $label): string
{
    if ($raw !== null && !is_string($raw) && !is_int($raw) && !is_float($raw)) {
        json_error(400, 'VALIDATION', "{$label} must be text.");
    }
    $s = trim(strip_tags((string) ($raw ?? '')));
    $s = preg_replace("/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u", '', $s) ?? '';
    if (mb_strlen($s) > $maxLen) {
        json_error(400, 'VALIDATION', "{$label} must be at most {$maxLen} characters.");
    }
    return $s;
}

/**
 * Strict `{ am|om|ha: { field: string } }` validation. Unknown languages/fields → 400.
 *
 * @param array<string, int> $fields field => max length
 * @return array<string, array<string, string>>
 */
function normalize_translations(mixed $raw, array $fields): array
{
    if ($raw === null || $raw === []) {
        return [];
    }
    if (!is_array($raw) || array_is_list($raw)) {
        json_error(400, 'VALIDATION', 'translations must be an object keyed by am, om, or ha.');
    }
    $out = [];
    foreach ($raw as $lang => $entry) {
        if (!in_array($lang, ['am', 'om', 'ha'], true)) {
            json_error(400, 'VALIDATION', 'translations keys must be am, om, or ha.');
        }
        if ($entry === null) {
            continue;
        }
        if (!is_array($entry) || ($entry !== [] && array_is_list($entry))) {
            json_error(400, 'VALIDATION', "translations.{$lang} must be an object.");
        }
        $norm = [];
        foreach ($entry as $key => $value) {
            if (!is_string($key) || !isset($fields[$key])) {
                json_error(400, 'VALIDATION', "Unsupported translations.{$lang}.{$key}.");
            }
            $text = plain_text($value, $fields[$key], "translations.{$lang}.{$key}");
            if ($text !== '') {
                $norm[$key] = $text;
            }
        }
        if ($norm !== []) {
            $out[$lang] = $norm;
        }
    }
    return $out;
}

/** @return array<string, mixed> */
function decode_json_object(mixed $value): array
{
    if (is_string($value) && $value !== '') {
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
    return is_array($value) ? $value : [];
}

/**
 * Locale → English fallback per field. usedFallback is true when any non-empty
 * English field had no translation in the requested locale.
 *
 * @param array<string, ?string> $base English values for translatable fields
 * @return array{values: array<string, ?string>, language: string, usedFallback: bool}
 */
function resolve_translations(array $base, mixed $translations, string $lang): array
{
    if ($lang === 'en') {
        return ['values' => $base, 'language' => 'en', 'usedFallback' => false];
    }
    $entry = decode_json_object($translations)[$lang] ?? [];
    $values = [];
    $usedFallback = false;
    foreach ($base as $key => $english) {
        $tr = is_array($entry) && isset($entry[$key]) ? trim((string) $entry[$key]) : '';
        if ($tr !== '') {
            $values[$key] = $tr;
        } else {
            $values[$key] = $english;
            if ($english !== null && $english !== '') {
                $usedFallback = true;
            }
        }
    }
    return ['values' => $values, 'language' => $lang, 'usedFallback' => $usedFallback];
}

function parse_sort_order(mixed $raw): int
{
    if ($raw === null || $raw === '') {
        return 0;
    }
    if (filter_var($raw, FILTER_VALIDATE_INT) === false) {
        json_error(400, 'VALIDATION', 'Display order must be a whole number.');
    }
    $n = (int) $raw;
    if ($n < -100000 || $n > 100000) {
        json_error(400, 'VALIDATION', 'Display order is out of range.');
    }
    return $n;
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
