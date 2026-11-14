<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class ServicesController
{
    private const ICONS = ['file', 'message', 'megaphone', 'building', 'book'];

    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, description, category, responsible_office, eligibility,
                    required_documents, process, contact, icon, cover_image, status, created_at, updated_at
             FROM services
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY title ASC',
        );
        $stmt->execute(['inst' => Db::institutionId()]);
        json_response(200, ['items' => array_map([self::class, 'shape'], $stmt->fetchAll())]);
    }

    /** @param array<string, string> $params */
    public static function publicShow(array $params = []): void
    {
        $slug = $params['slug'] ?? '';
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Missing slug.');
        }
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, description, category, responsible_office, eligibility,
                    required_documents, process, contact, icon, cover_image, status, created_at, updated_at
             FROM services
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\' LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Service not found.');
        }
        json_response(200, self::shape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, description, category, responsible_office, eligibility,
                    required_documents, process, contact, icon, cover_image, status, created_at, updated_at
             FROM services WHERE institution_id = :inst ORDER BY updated_at DESC',
        );
        $stmt->execute(['inst' => Db::institutionId()]);
        json_response(200, ['items' => array_map([self::class, 'shape'], $stmt->fetchAll())]);
    }

    /** @param array<string, string> $params */
    public static function cmsShow(array $params = []): void
    {
        ContentPolicy::requireViewer();
        $row = self::findById($params['id'] ?? '');
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Service not found.');
        }
        json_response(200, self::shape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsCreate(array $_params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate($user['role'], $input['status']);
        $id = uuid_v4();

        try {
            $stmt = Db::pdo()->prepare(
                'INSERT INTO services
                   (id, institution_id, slug, title, summary, description, category, responsible_office,
                    eligibility, required_documents, process, contact, icon, cover_image, status)
                 VALUES
                   (:id, :inst, :slug, :title, :summary, :description, :category, :office,
                    :eligibility, :docs, :process, :contact, :icon, :cover, :status)',
            );
            $stmt->execute(self::bind($id, $input));
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A service with this slug already exists.');
            }
            throw $e;
        }

        json_response(201, self::shape(self::findById($id)));
    }

    /** @param array<string, string> $params */
    public static function cmsUpdate(array $params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Service not found.');
        }

        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );

        try {
            $stmt = Db::pdo()->prepare(
                'UPDATE services SET
                   slug = :slug, title = :title, summary = :summary, description = :description,
                   category = :category, responsible_office = :office, eligibility = :eligibility,
                   required_documents = :docs, process = :process,
                   contact = :contact, icon = :icon, cover_image = :cover, status = :status
                 WHERE institution_id = :inst AND id = :id',
            );
            $bind = self::bind($id, $input);
            unset($bind['id']);
            $stmt->execute($bind + ['id' => $id]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A service with this slug already exists.');
            }
            throw $e;
        }

        json_response(200, self::shape(self::findById($id)));
    }

    /** @param array<string, string> $params */
    public static function cmsArchive(array $params = []): void
    {
        ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        if (!self::findById($id)) {
            json_error(404, 'NOT_FOUND', 'Service not found.');
        }
        $stmt = Db::pdo()->prepare(
            'UPDATE services SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        json_response(200, self::shape(self::findById($id)));
    }

    /**
     * @param array{title:string,slug:string,summary:string,description:string,category:string,responsibleOffice:string,eligibility:string,requiredDocuments:list<string>,process:list<string>,contact:string,icon:string,status:string} $input
     * @return array<string, mixed>
     */
    private static function bind(string $id, array $input): array
    {
        return [
            'id' => $id,
            'inst' => Db::institutionId(),
            'slug' => $input['slug'],
            'title' => $input['title'],
            'summary' => $input['summary'] !== '' ? $input['summary'] : null,
            'description' => $input['description'] !== '' ? $input['description'] : null,
            'category' => $input['category'] !== '' ? $input['category'] : null,
            'office' => $input['responsibleOffice'] !== '' ? $input['responsibleOffice'] : null,
            'eligibility' => $input['eligibility'] !== '' ? $input['eligibility'] : null,
            'docs' => json_encode($input['requiredDocuments'], JSON_UNESCAPED_UNICODE),
            'process' => json_encode($input['process'], JSON_UNESCAPED_UNICODE),
            'contact' => $input['contact'] !== '' ? $input['contact'] : null,
            'icon' => $input['icon'],
            'cover' => $input['coverImage'] !== '' ? $input['coverImage'] : null,
            'status' => $input['status'],
        ];
    }

    /** @return array<string, mixed>|null */
    private static function findById(string $id): ?array
    {
        if ($id === '') {
            return null;
        }
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, description, category, responsible_office, eligibility,
                    required_documents, process, contact, icon, cover_image, status, created_at, updated_at
             FROM services WHERE institution_id = :inst AND id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{title:string,slug:string,summary:string,description:string,category:string,responsibleOffice:string,eligibility:string,requiredDocuments:list<string>,process:list<string>,contact:string,icon:string,status:string}
     */
    private static function validateBody(array $body): array
    {
        $title = trim((string) ($body['title'] ?? ''));
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        $summary = trim((string) ($body['summary'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));
        $category = trim((string) ($body['category'] ?? ''));
        $responsibleOffice = trim((string) ($body['responsibleOffice'] ?? ''));
        $eligibility = trim((string) ($body['eligibility'] ?? ''));
        $contact = trim((string) ($body['contact'] ?? ''));
        $icon = trim((string) ($body['icon'] ?? 'file')) ?: 'file';
        $coverImage = trim((string) ($body['coverImage'] ?? ''));
        $status = require_content_status($body['status'] ?? 'draft');
        $requiredDocuments = self::stringList($body['requiredDocuments'] ?? []);
        $process = self::stringList($body['process'] ?? []);

        if ($title === '') {
            json_error(400, 'VALIDATION', 'Title is required.');
        }
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Slug is required.');
        }
        if (!is_valid_slug($slug)) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }
        if (!in_array($icon, self::ICONS, true)) {
            json_error(400, 'VALIDATION', 'Invalid icon.');
        }
        if ($coverImage !== '' && !self::isSafeCoverUrl($coverImage)) {
            json_error(400, 'VALIDATION', 'Cover image must be a site path (/media/…) or https URL.');
        }

        return compact(
            'title',
            'slug',
            'summary',
            'description',
            'category',
            'responsibleOffice',
            'eligibility',
            'requiredDocuments',
            'process',
            'contact',
            'icon',
            'coverImage',
            'status',
        );
    }

    private static function isSafeCoverUrl(string $url): bool
    {
        if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
            return strlen($url) <= 512;
        }
        return (bool) preg_match('#^https://#i', $url) && strlen($url) <= 512;
    }

    /** @return list<string> */
    private static function stringList(mixed $value): array
    {
        if (is_string($value)) {
            $parts = preg_split('/\r\n|\r|\n/', $value) ?: [];
            $value = $parts;
        }
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $item) {
            if (is_string($item) && trim($item) !== '') {
                $out[] = trim($item);
            }
        }
        return $out;
    }

    /** @return list<string> */
    private static function jsonArray(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }
        return self::stringList($value);
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function shape(?array $row): array
    {
        if ($row === null) {
            json_error(500, 'DB', 'Service row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'summary' => $row['summary'] !== null ? (string) $row['summary'] : null,
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'category' => $row['category'] !== null ? (string) $row['category'] : null,
            'responsibleOffice' => $row['responsible_office'] !== null ? (string) $row['responsible_office'] : null,
            'eligibility' => $row['eligibility'] !== null ? (string) $row['eligibility'] : null,
            'requiredDocuments' => self::jsonArray($row['required_documents'] ?? []),
            'process' => self::jsonArray($row['process'] ?? []),
            'contact' => $row['contact'] !== null ? (string) $row['contact'] : null,
            'icon' => (string) ($row['icon'] ?: 'file'),
            'coverImage' => isset($row['cover_image']) && $row['cover_image'] !== null
                ? (string) $row['cover_image']
                : null,
            'status' => (string) $row['status'],
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
