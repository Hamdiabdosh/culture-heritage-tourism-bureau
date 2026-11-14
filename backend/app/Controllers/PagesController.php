<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class PagesController
{
    private const LANGS = ['en', 'am', 'om', 'ha'];
    private const TRANSLATION_LANGS = ['am', 'om', 'ha'];

    /** Fixed Visit Harar guide slots — About is static in the frontend. */
    private const GUIDE_SLUGS = ['plan', 'plan-itineraries'];

    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $lang = self::lang();
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, content, translations, status, updated_at
             FROM pages
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY updated_at DESC',
        );
        $stmt->execute(['inst' => Db::institutionId()]);
        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $resolved = self::resolve($row, $lang);
            $items[] = [
                'id' => (string) $row['id'],
                'slug' => (string) $row['slug'],
                'title' => $resolved['title'],
                'status' => (string) $row['status'],
                'updatedAt' => iso_utc((string) $row['updated_at']),
                'language' => $resolved['language'],
                'usedFallback' => $resolved['usedFallback'],
            ];
        }
        json_response(200, ['items' => $items]);
    }

    /** @param array<string, string> $params */
    public static function publicShow(array $params = []): void
    {
        $slug = $params['slug'] ?? '';
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Missing slug.');
        }

        $lang = self::lang();
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, content, translations, status, updated_at
             FROM pages
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\'
             LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Page not found.');
        }

        $resolved = self::resolve($row, $lang);
        json_response(200, [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => $resolved['title'],
            'content' => $resolved['content'],
            'status' => (string) $row['status'],
            'updatedAt' => iso_utc((string) $row['updated_at']),
            'language' => $resolved['language'],
            'usedFallback' => $resolved['usedFallback'],
        ]);
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, content, translations, status, created_at, updated_at
             FROM pages WHERE institution_id = :inst ORDER BY updated_at DESC',
        );
        $stmt->execute(['inst' => Db::institutionId()]);
        json_response(200, ['items' => array_map([self::class, 'cmsShape'], $stmt->fetchAll())]);
    }

    /** @param array<string, string> $params */
    public static function cmsShow(array $params = []): void
    {
        ContentPolicy::requireViewer();
        $row = self::findById($params['id'] ?? '');
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Page not found.');
        }
        json_response(200, self::cmsShape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsCreate(array $_params = []): void
    {
        ContentPolicy::requireEditor();
        // Visit Harar uses fixed guide slots only — no freeform public pages.
        json_error(
            403,
            'FORBIDDEN',
            'New pages are disabled. Edit Plan your visit or Itineraries intro instead.',
        );
    }

    /** @param array<string, string> $params */
    public static function cmsUpdate(array $params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Page not found.');
        }

        $existingSlug = (string) $existing['slug'];
        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );

        // Guide slots keep their public URL forever.
        if (in_array($existingSlug, self::GUIDE_SLUGS, true)) {
            $input['slug'] = $existingSlug;
        } elseif (in_array($input['slug'], self::GUIDE_SLUGS, true)) {
            json_error(400, 'VALIDATION', 'That slug is reserved for a fixed guide page.');
        }

        // Do not archive fixed guide slots — unpublish via draft instead.
        if (in_array($existingSlug, self::GUIDE_SLUGS, true) && $input['status'] === 'archived') {
            json_error(
                400,
                'VALIDATION',
                'Guide pages cannot be archived. Set status to draft to hide them from the public site.',
            );
        }

        try {
            $stmt = Db::pdo()->prepare(
                'UPDATE pages SET slug = :slug, title = :title, content = :content,
                   translations = :translations, status = :status
                 WHERE institution_id = :inst AND id = :id',
            );
            $stmt->execute([
                'slug' => $input['slug'],
                'title' => $input['title'],
                'content' => $input['content'],
                'translations' => json_encode($input['translations'], JSON_UNESCAPED_UNICODE),
                'status' => $input['status'],
                'inst' => Db::institutionId(),
                'id' => $id,
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A page with this slug already exists.');
            }
            throw $e;
        }

        json_response(200, self::cmsShape(self::findById($id)));
    }

    /** @param array<string, string> $params */
    public static function cmsArchive(array $params = []): void
    {
        ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Page not found.');
        }
        if (in_array((string) $existing['slug'], self::GUIDE_SLUGS, true)) {
            json_error(
                400,
                'VALIDATION',
                'Guide pages cannot be archived. Set status to draft to hide them from the public site.',
            );
        }
        $stmt = Db::pdo()->prepare(
            'UPDATE pages SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        json_response(200, self::cmsShape(self::findById($id)));
    }

    /** @return array<string, mixed>|null */
    private static function findById(string $id): ?array
    {
        if ($id === '') {
            return null;
        }
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, content, translations, status, created_at, updated_at
             FROM pages WHERE institution_id = :inst AND id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{title:string,slug:string,content:?string,status:string,translations:array<string,array{title:string,content:?string}>}
     */
    private static function validateBody(array $body): array
    {
        $title = trim((string) ($body['title'] ?? ''));
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        $contentRaw = trim((string) ($body['content'] ?? ''));
        $content = $contentRaw !== '' ? $contentRaw : null;
        $status = require_content_status($body['status'] ?? 'draft');

        if ($title === '') {
            json_error(400, 'VALIDATION', 'Title is required.');
        }
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Slug is required.');
        }
        if (!is_valid_slug($slug)) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }

        return [
            'title' => $title,
            'slug' => $slug,
            'content' => $content,
            'status' => $status,
            'translations' => self::normalizeTranslations($body['translations'] ?? []),
        ];
    }

    /** @return array<string, array{title:string,content:?string}> */
    private static function normalizeTranslations(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach (self::TRANSLATION_LANGS as $code) {
            $entry = $raw[$code] ?? null;
            if (!is_array($entry)) {
                continue;
            }
            $t = trim((string) ($entry['title'] ?? ''));
            $c = trim((string) ($entry['content'] ?? ''));
            if ($t === '' && $c === '') {
                continue;
            }
            $out[$code] = ['title' => $t, 'content' => $c !== '' ? $c : null];
        }
        return $out;
    }

    private static function lang(): string
    {
        $raw = strtolower(trim((string) ($_GET['lang'] ?? 'en')));
        return in_array($raw, self::LANGS, true) ? $raw : 'en';
    }

    /**
     * @param array<string, mixed> $row
     * @return array{title:string,content:?string,language:string,usedFallback:bool}
     */
    private static function resolve(array $row, string $lang): array
    {
        $englishTitle = (string) $row['title'];
        $englishContent = $row['content'] !== null ? (string) $row['content'] : null;
        if ($lang === 'en') {
            return [
                'title' => $englishTitle,
                'content' => $englishContent,
                'language' => 'en',
                'usedFallback' => false,
            ];
        }

        $translations = self::decodeTranslations($row['translations'] ?? null);
        $entry = $translations[$lang] ?? null;
        if (is_array($entry) && ((isset($entry['title']) && trim((string) $entry['title']) !== '')
            || (isset($entry['content']) && trim((string) ($entry['content'] ?? '')) !== ''))) {
            $title = trim((string) ($entry['title'] ?? ''));
            $content = trim((string) ($entry['content'] ?? ''));
            return [
                'title' => $title !== '' ? $title : $englishTitle,
                'content' => $content !== '' ? $content : $englishContent,
                'language' => $lang,
                'usedFallback' => false,
            ];
        }

        return [
            'title' => $englishTitle,
            'content' => $englishContent,
            'language' => $lang,
            'usedFallback' => true,
        ];
    }

    /** @return array<string, mixed> */
    private static function decodeTranslations(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function cmsShape(?array $row): array
    {
        if ($row === null) {
            json_error(500, 'DB', 'Page row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'content' => $row['content'] !== null ? (string) $row['content'] : null,
            'translations' => self::decodeTranslations($row['translations'] ?? null),
            'status' => (string) $row['status'],
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
