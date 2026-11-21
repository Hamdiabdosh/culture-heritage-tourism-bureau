<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;

final class InstitutionController
{
    private const TRANSLATION_LANGS = ['am', 'om', 'ha'];
    private const PROFILE_TEXT_KEYS = ['mission', 'vision', 'history'];
    private const PROFILE_LIST_KEYS = ['values', 'objectives'];

    /** @param array<string, string> $_params */
    public static function show(array $_params = []): void
    {
        $row = self::fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Institution not found.');
        }
        json_response(200, self::shape($row));
    }

    /** CMS: editors may update institution identity and profile fields. */
    /** @param array<string, string> $_params */
    public static function cmsUpdate(array $_params = []): void
    {
        ContentPolicy::requireEditor();
        $existing = self::fetch();
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Institution not found.');
        }

        // Institution id is bound from config — never accept client-supplied id.
        $body = json_body();
        $name = self::plainText((string) ($body['name'] ?? ''), 255);
        $shortName = self::plainText((string) ($body['shortName'] ?? ''), 64);
        if ($name === '') {
            json_error(400, 'VALIDATION', 'Name is required.');
        }
        if ($shortName === '') {
            json_error(400, 'VALIDATION', 'Short name is required.');
        }

        $mission = self::nullablePlain((string) ($body['mission'] ?? ''), 20000);
        $vision = self::nullablePlain((string) ($body['vision'] ?? ''), 20000);
        $history = self::nullablePlain((string) ($body['history'] ?? ''), 100000);
        $values = self::normalizeStringList($body['values'] ?? ($body['valuesJson'] ?? null), 'values');
        $objectives = self::normalizeStringList($body['objectives'] ?? ($body['objectivesJson'] ?? null), 'objectives');
        $translations = self::normalizeProfileTranslations($body['profileTranslations'] ?? null);

        $stmt = Db::pdo()->prepare(
            'UPDATE institutions SET
               name = :name,
               short_name = :short_name,
               tagline = :tagline,
               description = :description,
               eyebrow = :eyebrow,
               address = :address,
               phone = :phone,
               email = :email,
               hours = :hours,
               mission = :mission,
               vision = :vision,
               history = :history,
               values_json = :values_json,
               objectives_json = :objectives_json,
               profile_translations = :profile_translations
             WHERE id = :id',
        );
        $stmt->execute([
            'name' => $name,
            'short_name' => $shortName,
            'tagline' => self::nullablePlain((string) ($body['tagline'] ?? ''), 2000),
            'description' => self::nullablePlain((string) ($body['description'] ?? ''), 20000),
            'eyebrow' => self::nullablePlain((string) ($body['eyebrow'] ?? ''), 255),
            'address' => self::nullablePlain((string) ($body['address'] ?? ''), 2000),
            'phone' => self::nullablePlain((string) ($body['phone'] ?? ''), 64),
            'email' => self::nullablePlain((string) ($body['email'] ?? ''), 255),
            'hours' => self::nullablePlain((string) ($body['hours'] ?? ''), 255),
            'mission' => $mission,
            'vision' => $vision,
            'history' => $history,
            'values_json' => self::encodeJsonOrNull($values),
            'objectives_json' => self::encodeJsonOrNull($objectives),
            'profile_translations' => self::encodeJsonOrNull($translations === [] ? null : $translations),
            'id' => Db::institutionId(),
        ]);

        $row = self::fetch();
        if (!$row) {
            json_error(500, 'DB', 'Institution missing after update.');
        }
        json_response(200, self::shape($row));
    }

    /** @return array<string, mixed>|null */
    private static function fetch(): ?array
    {
        $stmt = Db::pdo()->prepare(
            'SELECT id, name, short_name, tagline, description, eyebrow, address, phone, email, hours,
                    mission, vision, history, values_json, objectives_json, profile_translations
             FROM institutions WHERE id = :id LIMIT 1',
        );
        $stmt->execute(['id' => Db::institutionId()]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function shape(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'shortName' => (string) $row['short_name'],
            'tagline' => self::nullStr($row['tagline'] ?? null),
            'description' => self::nullStr($row['description'] ?? null),
            'eyebrow' => self::nullStr($row['eyebrow'] ?? null),
            'address' => self::nullStr($row['address'] ?? null),
            'phone' => self::nullStr($row['phone'] ?? null),
            'email' => self::nullStr($row['email'] ?? null),
            'hours' => self::nullStr($row['hours'] ?? null),
            'mission' => self::nullStr($row['mission'] ?? null),
            'vision' => self::nullStr($row['vision'] ?? null),
            'history' => self::nullStr($row['history'] ?? null),
            'values' => self::decodeStringList($row['values_json'] ?? null),
            'objectives' => self::decodeStringList($row['objectives_json'] ?? null),
            // Cast so empty translations encode as {} not [] for clients.
            'profileTranslations' => (object) self::decodeProfileTranslations($row['profile_translations'] ?? null),
        ];
    }

    private static function nullStr(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = (string) $v;
        return $s !== '' ? $s : null;
    }

    private static function plainText(string $raw, int $maxLen): string
    {
        $s = trim(strip_tags($raw));
        // Collapse dangerous control chars but keep newlines for textarea fields.
        $s = preg_replace("/[\x00-\x08\x0B\x0C\x0E-\x1F]/u", '', $s) ?? '';
        if (mb_strlen($s) > $maxLen) {
            json_error(400, 'VALIDATION', 'Text exceeds maximum length.');
        }
        return $s;
    }

    private static function nullablePlain(string $raw, int $maxLen): ?string
    {
        $s = self::plainText($raw, $maxLen);
        return $s !== '' ? $s : null;
    }

    /**
     * @return list<string>|null
     */
    private static function normalizeStringList(mixed $raw, string $label): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                json_error(400, 'VALIDATION', "Invalid {$label} JSON.");
            }
            $raw = $decoded;
        }
        if (!is_array($raw)) {
            json_error(400, 'VALIDATION', "Invalid {$label} payload.");
        }
        // Reject associative maps — expect a list of strings.
        if ($raw !== [] && array_keys($raw) !== range(0, count($raw) - 1)) {
            json_error(400, 'VALIDATION', "{$label} must be a JSON array of strings.");
        }
        $out = [];
        foreach ($raw as $item) {
            if (!is_string($item) && !is_numeric($item)) {
                json_error(400, 'VALIDATION', "{$label} items must be strings.");
            }
            $s = self::plainText((string) $item, 2000);
            if ($s !== '') {
                $out[] = $s;
            }
        }
        return $out === [] ? null : array_values($out);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function normalizeProfileTranslations(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                json_error(400, 'VALIDATION', 'Invalid profileTranslations JSON.');
            }
            $raw = $decoded;
        }
        if (!is_array($raw)) {
            json_error(400, 'VALIDATION', 'Invalid profileTranslations payload.');
        }

        $out = [];
        foreach ($raw as $lang => $entry) {
            if (!is_string($lang) || !in_array($lang, self::TRANSLATION_LANGS, true)) {
                json_error(400, 'VALIDATION', 'profileTranslations keys must be am, om, or ha.');
            }
            if ($entry === null) {
                continue;
            }
            if (!is_array($entry)) {
                json_error(400, 'VALIDATION', "profileTranslations.{$lang} must be an object.");
            }
            $norm = [];
            foreach (self::PROFILE_TEXT_KEYS as $key) {
                if (!array_key_exists($key, $entry)) {
                    continue;
                }
                $val = $entry[$key];
                if ($val === null || $val === '') {
                    continue;
                }
                if (!is_string($val) && !is_numeric($val)) {
                    json_error(400, 'VALIDATION', "profileTranslations.{$lang}.{$key} must be a string.");
                }
                $text = self::nullablePlain((string) $val, $key === 'history' ? 100000 : 20000);
                if ($text !== null) {
                    $norm[$key] = $text;
                }
            }
            foreach (self::PROFILE_LIST_KEYS as $key) {
                if (!array_key_exists($key, $entry)) {
                    continue;
                }
                $list = self::normalizeStringList($entry[$key], "profileTranslations.{$lang}.{$key}");
                if ($list !== null) {
                    $norm[$key] = $list;
                }
            }
            // Reject unknown keys to avoid smuggling HTML blobs under other names.
            foreach (array_keys($entry) as $k) {
                if (!in_array($k, [...self::PROFILE_TEXT_KEYS, ...self::PROFILE_LIST_KEYS], true)) {
                    json_error(400, 'VALIDATION', "Unsupported profileTranslations.{$lang}.{$k}.");
                }
            }
            if ($norm !== []) {
                $out[$lang] = $norm;
            }
        }
        return $out;
    }

    /**
     * @return list<string>
     */
    private static function decodeStringList(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return [];
            }
            $raw = $decoded;
        }
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $item) {
            if (is_string($item) || is_numeric($item)) {
                $s = trim((string) $item);
                if ($s !== '') {
                    $out[] = $s;
                }
            }
        }
        return $out;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private static function decodeProfileTranslations(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                return [];
            }
            $raw = $decoded;
        }
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach (self::TRANSLATION_LANGS as $lang) {
            if (!isset($raw[$lang]) || !is_array($raw[$lang])) {
                continue;
            }
            $entry = $raw[$lang];
            $norm = [];
            foreach (self::PROFILE_TEXT_KEYS as $key) {
                if (isset($entry[$key]) && (is_string($entry[$key]) || is_numeric($entry[$key]))) {
                    $s = trim((string) $entry[$key]);
                    if ($s !== '') {
                        $norm[$key] = $s;
                    }
                }
            }
            foreach (self::PROFILE_LIST_KEYS as $key) {
                if (array_key_exists($key, $entry)) {
                    $norm[$key] = self::decodeStringList($entry[$key]);
                }
            }
            if ($norm !== []) {
                $out[$lang] = $norm;
            }
        }
        return $out;
    }

    private static function encodeJsonOrNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
