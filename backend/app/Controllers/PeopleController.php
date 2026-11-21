<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

/** Leadership / staff profiles. Names are not translated; title + bio are. */
final class PeopleController
{
    private const TRANSLATABLE = ['title' => 255, 'bio' => 20000];

    private const COLUMNS = 'p.id, p.department_id, p.slug, p.full_name, p.title, p.bio, p.email, p.phone,
        p.sort_order, p.is_leadership, p.status, p.translations, p.created_at, p.updated_at';

    /** Department exposed publicly only when it is itself published. */
    private const PUBLIC_SELECT = 'SELECT p.slug, p.full_name, p.title, p.bio, p.email, p.phone, p.sort_order,
          p.is_leadership, p.translations,
          d.slug AS dept_slug, d.name AS dept_name, d.summary AS dept_summary,
          d.description AS dept_description, d.translations AS dept_translations
        FROM people p
        LEFT JOIN departments d
          ON d.institution_id = p.institution_id AND d.id = p.department_id AND d.status = \'published\'';

    /** @param array<string, string> $_params */
    public static function publicLeadership(array $_params = []): void
    {
        $stmt = Db::pdo()->prepare(
            self::PUBLIC_SELECT . '
             WHERE p.institution_id = :inst AND p.status = \'published\' AND p.is_leadership = 1
             ORDER BY p.sort_order ASC, p.full_name ASC',
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
            self::PUBLIC_SELECT . '
             WHERE p.institution_id = :inst AND p.slug = :slug AND p.status = \'published\' LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $params['slug'] ?? '']);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Person not found.');
        }
        json_response(200, self::publicShape($row, request_lang()));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $stmt = Db::pdo()->prepare(
            'SELECT ' . self::COLUMNS . ' FROM people p
             WHERE p.institution_id = :inst
             ORDER BY p.is_leadership DESC, p.sort_order ASC, p.full_name ASC',
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
            json_error(404, 'NOT_FOUND', 'Person not found.');
        }
        json_response(200, self::cmsShape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsCreate(array $_params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $input = self::validateBody(json_body(), null);
        $input['status'] = ContentPolicy::enforcePublishingGate($user['role'], $input['status']);
        $id = uuid_v4();
        self::write(
            'INSERT INTO people
               (id, institution_id, department_id, slug, full_name, title, bio, email, phone,
                sort_order, is_leadership, status, translations)
             VALUES (:id, :inst, :department_id, :slug, :full_name, :title, :bio, :email, :phone,
                :sort_order, :is_leadership, :status, :translations)',
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
            json_error(404, 'NOT_FOUND', 'Person not found.');
        }
        $input = self::validateBody(json_body(), $existing);
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );
        self::write(
            'UPDATE people SET department_id = :department_id, slug = :slug, full_name = :full_name,
               title = :title, bio = :bio, email = :email, phone = :phone, sort_order = :sort_order,
               is_leadership = :is_leadership, status = :status, translations = :translations
             WHERE institution_id = :inst AND id = :id',
            $id,
            $input,
        );
        json_response(200, self::cmsShape(self::findById($id)));
    }

    /** @param array<string, string> $params */
    public static function cmsArchive(array $params = []): void
    {
        ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        if (!self::findById($id)) {
            json_error(404, 'NOT_FOUND', 'Person not found.');
        }
        $stmt = Db::pdo()->prepare(
            'UPDATE people SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
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
            'SELECT ' . self::COLUMNS . ' FROM people p WHERE p.institution_id = :inst AND p.id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** @param array<string, mixed> $input */
    private static function write(string $sql, string $id, array $input): void
    {
        try {
            Db::pdo()->prepare($sql)->execute([
                'id' => $id,
                'inst' => Db::institutionId(),
                'department_id' => $input['departmentId'],
                'slug' => $input['slug'],
                'full_name' => $input['fullName'],
                'title' => $input['title'],
                'bio' => $input['bio'] !== '' ? $input['bio'] : null,
                'email' => $input['email'] !== '' ? $input['email'] : null,
                'phone' => $input['phone'] !== '' ? $input['phone'] : null,
                'sort_order' => $input['sortOrder'],
                'is_leadership' => $input['isLeadership'] ? 1 : 0,
                'status' => $input['status'],
                'translations' => json_encode((object) $input['translations'], JSON_UNESCAPED_UNICODE),
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A person with this slug already exists.');
            }
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed>|null $existing
     * @return array<string, mixed>
     */
    private static function validateBody(array $body, ?array $existing): array
    {
        $fullName = plain_text($body['fullName'] ?? '', 255, 'Full name');
        $title = plain_text($body['title'] ?? '', self::TRANSLATABLE['title'], 'Title');
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        if ($fullName === '') {
            json_error(400, 'VALIDATION', 'Full name is required.');
        }
        if ($title === '') {
            json_error(400, 'VALIDATION', 'Title is required.');
        }
        if ($slug === '' || !is_valid_slug($slug) || strlen($slug) > 255) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }

        $email = plain_text($body['email'] ?? '', 255, 'Email');
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            json_error(400, 'VALIDATION', 'Email address is not valid.');
        }
        $phone = plain_text($body['phone'] ?? '', 64, 'Phone');
        if ($phone !== '' && !preg_match('/^\+?[0-9 ()\-.]{3,64}$/', $phone)) {
            json_error(400, 'VALIDATION', 'Phone may contain digits, spaces, +, -, ( ) and dots only.');
        }

        $isLeadership = $body['isLeadership'] ?? false;
        if (!is_bool($isLeadership) && !in_array($isLeadership, [0, 1, '0', '1'], true)) {
            json_error(400, 'VALIDATION', 'isLeadership must be true or false.');
        }

        return [
            'fullName' => $fullName,
            'title' => $title,
            'slug' => $slug,
            'bio' => plain_text($body['bio'] ?? '', self::TRANSLATABLE['bio'], 'Biography'),
            'email' => $email,
            'phone' => $phone,
            'departmentId' => self::validateDepartment($body['departmentId'] ?? null, $existing),
            'sortOrder' => parse_sort_order($body['sortOrder'] ?? 0),
            'isLeadership' => (bool) $isLeadership,
            'status' => require_content_status($body['status'] ?? 'draft'),
            'translations' => normalize_translations($body['translations'] ?? null, self::TRANSLATABLE),
        ];
    }

    /**
     * Department must belong to this institution and not be archived
     * (an unchanged existing link to an archived department is tolerated).
     *
     * @param array<string, mixed>|null $existing
     */
    private static function validateDepartment(mixed $raw, ?array $existing): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (!is_string($raw)) {
            json_error(400, 'VALIDATION', 'departmentId must be a string.');
        }
        $dept = DepartmentsController::findById($raw);
        if ($dept === null) {
            json_error(400, 'VALIDATION', 'Selected department does not exist.');
        }
        $unchanged = $existing !== null && (string) ($existing['department_id'] ?? '') === $raw;
        if ($dept['status'] === 'archived' && !$unchanged) {
            json_error(400, 'VALIDATION', 'Selected department is archived.');
        }
        return $raw;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function publicShape(array $row, string $lang): array
    {
        $resolved = resolve_translations([
            'title' => (string) $row['title'],
            'bio' => $row['bio'] !== null ? (string) $row['bio'] : null,
        ], $row['translations'] ?? null, $lang);

        $department = null;
        if ($row['dept_slug'] !== null) {
            $dept = DepartmentsController::publicShape([
                'slug' => $row['dept_slug'],
                'name' => $row['dept_name'],
                'summary' => $row['dept_summary'],
                'description' => $row['dept_description'],
                'sort_order' => 0,
                'translations' => $row['dept_translations'],
            ], $lang);
            $department = ['slug' => $dept['slug'], 'name' => $dept['name']];
        }

        return [
            'slug' => (string) $row['slug'],
            'fullName' => (string) $row['full_name'],
            ...$resolved['values'],
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'isLeadership' => (bool) $row['is_leadership'],
            'sortOrder' => (int) $row['sort_order'],
            'department' => $department,
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
            json_error(500, 'DB', 'Person row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'departmentId' => $row['department_id'] !== null ? (string) $row['department_id'] : null,
            'slug' => (string) $row['slug'],
            'fullName' => (string) $row['full_name'],
            'title' => (string) $row['title'],
            'bio' => $row['bio'] !== null ? (string) $row['bio'] : null,
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'sortOrder' => (int) $row['sort_order'],
            'isLeadership' => (bool) $row['is_leadership'],
            'status' => (string) $row['status'],
            'translations' => (object) decode_json_object($row['translations'] ?? null),
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
