<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class DocumentsController
{
    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, category, year, file_url, file_type, file_size, status, created_at, updated_at
             FROM documents
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY created_at DESC',
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
            'SELECT id, slug, title, summary, category, year, file_url, file_type, file_size, status, created_at, updated_at
             FROM documents
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\' LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Document not found.');
        }
        json_response(200, self::shape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, category, year, file_url, file_type, file_size, status, created_at, updated_at
             FROM documents WHERE institution_id = :inst ORDER BY updated_at DESC',
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
            json_error(404, 'NOT_FOUND', 'Document not found.');
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
                'INSERT INTO documents
                   (id, institution_id, slug, title, summary, category, year, file_url, file_type, file_size, status)
                 VALUES
                   (:id, :inst, :slug, :title, :summary, :category, :year, :file_url, :file_type, :file_size, :status)',
            );
            $stmt->execute([
                'id' => $id,
                'inst' => Db::institutionId(),
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'category' => $input['category'] !== '' ? $input['category'] : null,
                'year' => $input['year'] !== '' ? $input['year'] : null,
                'file_url' => $input['fileUrl'] !== '' ? $input['fileUrl'] : null,
                'file_type' => $input['fileType'] !== '' ? $input['fileType'] : null,
                'file_size' => $input['fileSize'] !== '' ? $input['fileSize'] : null,
                'status' => $input['status'],
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A document with this slug already exists.');
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
            json_error(404, 'NOT_FOUND', 'Document not found.');
        }

        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );

        try {
            $stmt = Db::pdo()->prepare(
                'UPDATE documents SET
                   slug = :slug, title = :title, summary = :summary, category = :category, year = :year,
                   file_url = :file_url, file_type = :file_type, file_size = :file_size, status = :status
                 WHERE institution_id = :inst AND id = :id',
            );
            $stmt->execute([
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'category' => $input['category'] !== '' ? $input['category'] : null,
                'year' => $input['year'] !== '' ? $input['year'] : null,
                'file_url' => $input['fileUrl'] !== '' ? $input['fileUrl'] : null,
                'file_type' => $input['fileType'] !== '' ? $input['fileType'] : null,
                'file_size' => $input['fileSize'] !== '' ? $input['fileSize'] : null,
                'status' => $input['status'],
                'inst' => Db::institutionId(),
                'id' => $id,
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'A document with this slug already exists.');
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
            json_error(404, 'NOT_FOUND', 'Document not found.');
        }
        $stmt = Db::pdo()->prepare(
            'UPDATE documents SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        json_response(200, self::shape(self::findById($id)));
    }

    /** @return array<string, mixed>|null */
    private static function findById(string $id): ?array
    {
        if ($id === '') {
            return null;
        }
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, category, year, file_url, file_type, file_size, status, created_at, updated_at
             FROM documents WHERE institution_id = :inst AND id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{title:string,slug:string,summary:string,category:string,year:string,fileUrl:string,fileType:string,fileSize:string,status:string}
     */
    private static function validateBody(array $body): array
    {
        $title = trim((string) ($body['title'] ?? ''));
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        $summary = trim((string) ($body['summary'] ?? ''));
        $category = trim((string) ($body['category'] ?? ''));
        $year = trim((string) ($body['year'] ?? ''));
        $fileUrl = trim((string) ($body['fileUrl'] ?? ''));
        $fileType = trim((string) ($body['fileType'] ?? ''));
        $fileSize = trim((string) ($body['fileSize'] ?? ''));
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
        if (!is_allowed_document_file_url($fileUrl)) {
            json_error(400, 'VALIDATION', 'File URL must be a relative path or an HTTP/HTTPS URL.');
        }

        return compact('title', 'slug', 'summary', 'category', 'year', 'fileUrl', 'fileType', 'fileSize', 'status');
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function shape(?array $row): array
    {
        if ($row === null) {
            json_error(500, 'DB', 'Document row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'summary' => $row['summary'] !== null ? (string) $row['summary'] : null,
            'category' => $row['category'] !== null ? (string) $row['category'] : null,
            'year' => $row['year'] !== null ? (string) $row['year'] : null,
            'fileUrl' => $row['file_url'] !== null ? (string) $row['file_url'] : null,
            'fileType' => $row['file_type'] !== null ? (string) $row['file_type'] : null,
            'fileSize' => $row['file_size'] !== null ? (string) $row['file_size'] : null,
            'status' => (string) $row['status'],
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
