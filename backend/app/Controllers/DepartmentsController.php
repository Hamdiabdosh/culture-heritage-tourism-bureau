<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class DepartmentsController
{
    /** Translatable fields → max length. */
    public const TRANSLATABLE = ['name' => 255, 'summary' => 2000, 'description' => 20000];

    private const COLUMNS = 'id, slug, name, summary, description, sort_order, status, translations, created_at, updated_at';

    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT ' . self::COLUMNS . ' FROM departments
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY sort_order ASC, name ASC',
        );
        $stmt->execute(['inst' => Db::institutionId()]);
        $lang = request_lang();
        $items = array_map(static fn (array $row) => self::publicShape($row, $lang), $stmt->fetchAll());
        json_response(200, ['items' => $items]);
    }

    /** @param array<string, string> $params */
    public static function publicShow(array $params = []): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT ' . self::COLUMNS . ' FROM departments
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\' LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $params['slug'] ?? '']);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Department not found.');
        }
        json_response(200, self::publicShape($row, request_lang()));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $stmt = Db::pdo()->prepare(
            'SELECT ' . self::COLUMNS . ' FROM departments
             WHERE institution_id = :inst ORDER BY sort_order ASC, name ASC',
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
            json_error(404, 'NOT_FOUND', 'Department not found.');
        }
        json_response(200, self::cmsShape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsCreate(array $_params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate($user['role'], $input['status']);
        $id = uuid_v4();
        self::write(
            'INSERT INTO departments
               (id, institution_id, slug, name, summary, description, sort_order, status, translations)
             VALUES (:id, :inst, :slug, :name, :summary, :description, :sort_order, :status, :translations)',
            $id,
            $input,
        );
        json_response(201, self::cmsShape(self::findById($id)));
    }

    /** @param array<string, string> $params */
    public static function cmsUpdate(array $params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Department not found.');
        }
        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );
        if ($input['status'] === 'archived' && $existing['status'] !== 'archived') {
            self::assertNoActivePeople($id);
        }
        self::write(
            'UPDATE departments SET slug = :slug, name = :name, summary = :summary, description = :description,
               sort_order = :sort_order, status = :status, translations = :translations
             WHERE institution_id = :inst AND id = :id',
            $id,
            $input,
        );
        json_response(200, self::cmsShape(self::findById($id)));
    }

    /** Soft archive (DELETE verb, matching other CMS entities). */
    /** @param array<string, string> $params */
    public static function cmsArchive(array $params = []): void
    {
        ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        if (!self::findById($id)) {
            json_error(404, 'NOT_FOUND', 'Department not found.');
        }
        self::assertNoActivePeople($id);
        $stmt = Db::pdo()->prepare(
            'UPDATE departments SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        json_response(200, self::cmsShape(self::findById($id)));
    }

    /** @return array<string, mixed>|null Department in this institution (any status). */
    public static function findById(string $id): ?array
    {
        if ($id === '') {
            return null;
        }
        $stmt = Db::pdo()->prepare(
            'SELECT ' . self::COLUMNS . ' FROM departments WHERE institution_id = :inst AND id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private static function assertNoActivePeople(string $id): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT COUNT(*) FROM people
             WHERE institution_id = :inst AND department_id = :id AND status <> \'archived\'',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        if ((int) $stmt->fetchColumn() > 0) {
            json_error(
                409,
                'CONFLICT',
                'This department still has people assigned. Reassign or archive them first.',
            );
        }
    }

    /** @param array<string, mixed> $input */
    private static function write(string $sql, string $id, array $input): void
    {
        try {
            Db::pdo()->prepare($sql)->execute([
                'id' => $id,
                'inst' => Db::institutionId(),
                'slug' => $input['slug'],
                'name' => $input['name'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'description' => $input['description'] !== '' ? $input['description'] : null,
                'sort_order' => $input['sortOrder'],
                'status' => $input['status'],
                'translations' => json_encode((object) $input['translations'], JSON_UNESCAPED_UNICODE),
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A department with this slug already exists.');
            }
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private static function validateBody(array $body): array
    {
        $name = plain_text($body['name'] ?? '', self::TRANSLATABLE['name'], 'Name');
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        if ($name === '') {
            json_error(400, 'VALIDATION', 'Name is required.');
        }
        if ($slug === '' || !is_valid_slug($slug) || strlen($slug) > 255) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }
        return [
            'name' => $name,
            'slug' => $slug,
            'summary' => plain_text($body['summary'] ?? '', self::TRANSLATABLE['summary'], 'Summary'),
            'description' => plain_text(
                $body['description'] ?? '',
                self::TRANSLATABLE['description'],
                'Description',
            ),
            'sortOrder' => parse_sort_order($body['sortOrder'] ?? 0),
            'status' => require_content_status($body['status'] ?? 'draft'),
            'translations' => normalize_translations($body['translations'] ?? null, self::TRANSLATABLE),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function publicShape(array $row, string $lang): array
    {
        $resolved = resolve_translations([
            'name' => (string) $row['name'],
            'summary' => $row['summary'] !== null ? (string) $row['summary'] : null,
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
        ], $row['translations'] ?? null, $lang);
        return [
            'slug' => (string) $row['slug'],
            ...$resolved['values'],
            'sortOrder' => (int) $row['sort_order'],
            'language' => $resolved['language'],
            'usedFallback' => $resolved['usedFallback'],
        ];
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function cmsShape(?array $row): array
    {
        if ($row === null) {
            json_error(500, 'DB', 'Department row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'name' => (string) $row['name'],
            'summary' => $row['summary'] !== null ? (string) $row['summary'] : null,
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'sortOrder' => (int) $row['sort_order'],
            'status' => (string) $row['status'],
            'translations' => (object) decode_json_object($row['translations'] ?? null),
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
