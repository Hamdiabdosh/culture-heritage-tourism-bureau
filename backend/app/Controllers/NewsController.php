<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class NewsController
{
    private const STATUSES = ['draft', 'published', 'archived'];

    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, summary, content, category, cover_image, status, published_at, created_at, updated_at
             FROM news
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY COALESCE(published_at, created_at) DESC',
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

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, summary, content, category, cover_image, status, published_at, created_at, updated_at
             FROM news
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\'
             LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'News item not found.');
        }
        json_response(200, self::shape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, summary, content, category, cover_image, status, published_at, created_at, updated_at
             FROM news
             WHERE institution_id = :inst
             ORDER BY updated_at DESC',
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
            json_error(404, 'NOT_FOUND', 'News item not found.');
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
        $now = gmdate('Y-m-d H:i:s.v');
        $publishedAt = $input['status'] === 'published' ? $now : null;

        $pdo = Db::pdo();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO news
                   (id, institution_id, slug, title, summary, category, cover_image, content, status, published_at)
                 VALUES
                   (:id, :inst, :slug, :title, :summary, :category, :cover, :content, :status, :published_at)',
            );
            $stmt->execute([
                'id' => $id,
                'inst' => Db::institutionId(),
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'category' => $input['category'] !== '' ? $input['category'] : null,
                'cover' => $input['coverImage'] !== '' ? $input['coverImage'] : null,
                'content' => $input['content'],
                'status' => $input['status'],
                'published_at' => $publishedAt,
            ]);
        } catch (PDOException $e) {
            if (self::isDuplicate($e)) {
                json_error(409, 'CONFLICT', 'A news item with this slug already exists.');
            }
            throw $e;
        }

        $row = self::findById($id);
        json_response(201, self::shape($row ?? ['id' => $id] + $input));
    }

    /** @param array<string, string> $params */
    public static function cmsUpdate(array $params = []): void
    {
        $user = ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'News item not found.');
        }

        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );

        $publishedAt = $existing['published_at'];
        if ($input['status'] === 'published') {
            $publishedAt = $publishedAt ?: gmdate('Y-m-d H:i:s.v');
        }

        $pdo = Db::pdo();
        try {
            $stmt = $pdo->prepare(
                'UPDATE news SET
                   slug = :slug,
                   title = :title,
                   summary = :summary,
                   category = :category,
                   cover_image = :cover,
                   content = :content,
                   status = :status,
                   published_at = :published_at
                 WHERE institution_id = :inst AND id = :id',
            );
            $stmt->execute([
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'category' => $input['category'] !== '' ? $input['category'] : null,
                'cover' => $input['coverImage'] !== '' ? $input['coverImage'] : null,
                'content' => $input['content'],
                'status' => $input['status'],
                'published_at' => $publishedAt,
                'inst' => Db::institutionId(),
                'id' => $id,
            ]);
        } catch (PDOException $e) {
            if (self::isDuplicate($e)) {
                json_error(409, 'CONFLICT', 'A news item with this slug already exists.');
            }
            throw $e;
        }

        $row = self::findById($id);
        json_response(200, self::shape($row ?? $existing));
    }

    /** @param array<string, string> $params */
    public static function cmsArchive(array $params = []): void
    {
        ContentPolicy::requireEditor();
        $id = $params['id'] ?? '';
        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'News item not found.');
        }

        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'UPDATE news SET status = \'archived\'
             WHERE institution_id = :inst AND id = :id',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);

        $row = self::findById($id);
        json_response(200, self::shape($row ?? $existing));
    }

    /** @return array<string, mixed>|null */
    private static function findById(string $id): ?array
    {
        if ($id === '') {
            return null;
        }
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, slug, title, summary, content, category, cover_image, status, published_at, created_at, updated_at
             FROM news
             WHERE institution_id = :inst AND id = :id
             LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{title:string,slug:string,summary:string,category:string,coverImage:string,content:string,status:string}
     */
    private static function validateBody(array $body): array
    {
        $title = trim((string) ($body['title'] ?? ''));
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        $summary = trim((string) ($body['summary'] ?? ''));
        $category = trim((string) ($body['category'] ?? ''));
        $coverImage = trim((string) ($body['coverImage'] ?? ''));
        $content = trim((string) ($body['content'] ?? ''));
        $status = (string) ($body['status'] ?? 'draft');

        if ($title === '') {
            json_error(400, 'VALIDATION', 'Title is required.');
        }
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Slug is required.');
        }
        if (!is_valid_slug($slug)) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }
        if ($content === '') {
            json_error(400, 'VALIDATION', 'Content is required.');
        }
        if (!in_array($status, self::STATUSES, true)) {
            json_error(400, 'VALIDATION', 'Invalid status.');
        }
        if ($coverImage !== '' && !self::isSafeCoverUrl($coverImage)) {
            json_error(400, 'VALIDATION', 'Cover image must be a site path (/media/…) or https URL.');
        }

        return compact('title', 'slug', 'summary', 'category', 'coverImage', 'content', 'status');
    }

    private static function isSafeCoverUrl(string $url): bool
    {
        if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
            return strlen($url) <= 512;
        }
        return (bool) preg_match('#^https://#i', $url) && strlen($url) <= 512;
    }

    private static function isDuplicate(PDOException $e): bool
    {
        return $e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate');
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function shape(array $row): array
    {
        return [
            'id' => (string) ($row['id'] ?? ''),
            'slug' => (string) ($row['slug'] ?? ''),
            'title' => (string) ($row['title'] ?? ''),
            'summary' => isset($row['summary']) && $row['summary'] !== null ? (string) $row['summary'] : null,
            'content' => isset($row['content']) && $row['content'] !== null ? (string) $row['content'] : null,
            'category' => isset($row['category']) && $row['category'] !== null ? (string) $row['category'] : null,
            'coverImage' => isset($row['cover_image']) && $row['cover_image'] !== null
                ? (string) $row['cover_image']
                : null,
            'status' => (string) ($row['status'] ?? 'draft'),
            'publishedAt' => iso_utc(isset($row['published_at']) && $row['published_at'] !== null ? (string) $row['published_at'] : null),
            'createdAt' => iso_utc(isset($row['created_at']) ? (string) $row['created_at'] : null),
            'updatedAt' => iso_utc(isset($row['updated_at']) ? (string) $row['updated_at'] : null),
        ];
    }
}
