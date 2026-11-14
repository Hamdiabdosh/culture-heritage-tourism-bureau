<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;
use PDOException;

final class EventsController
{
    /** @param array<string, string> $_params */
    public static function publicList(array $_params = []): void
    {
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, content, event_date, location, type, status, created_at, updated_at
             FROM events
             WHERE institution_id = :inst AND status = \'published\'
             ORDER BY
               CASE WHEN event_date >= UTC_TIMESTAMP(3) THEN 0 ELSE 1 END ASC,
               CASE WHEN event_date >= UTC_TIMESTAMP(3) THEN event_date END ASC,
               CASE WHEN event_date < UTC_TIMESTAMP(3) THEN event_date END DESC',
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
            'SELECT id, slug, title, summary, content, event_date, location, type, status, created_at, updated_at
             FROM events
             WHERE institution_id = :inst AND slug = :slug AND status = \'published\' LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'slug' => $slug]);
        $row = $stmt->fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Event not found.');
        }
        json_response(200, self::shape($row));
    }

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $stmt = Db::pdo()->prepare(
            'SELECT id, slug, title, summary, content, event_date, location, type, status, created_at, updated_at
             FROM events WHERE institution_id = :inst ORDER BY event_date DESC',
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
            json_error(404, 'NOT_FOUND', 'Event not found.');
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
                'INSERT INTO events
                   (id, institution_id, slug, title, summary, content, event_date, location, type, status)
                 VALUES
                   (:id, :inst, :slug, :title, :summary, :content, :event_date, :location, :type, :status)',
            );
            $stmt->execute([
                'id' => $id,
                'inst' => Db::institutionId(),
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'content' => $input['content'] !== '' ? $input['content'] : null,
                'event_date' => $input['eventDate'],
                'location' => $input['location'] !== '' ? $input['location'] : null,
                'type' => $input['type'] !== '' ? $input['type'] : null,
                'status' => $input['status'],
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'An event with this slug already exists.');
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
            json_error(404, 'NOT_FOUND', 'Event not found.');
        }

        $input = self::validateBody(json_body());
        $input['status'] = ContentPolicy::enforcePublishingGate(
            $user['role'],
            $input['status'],
            (string) $existing['status'],
        );

        try {
            $stmt = Db::pdo()->prepare(
                'UPDATE events SET slug = :slug, title = :title, summary = :summary, content = :content,
                   event_date = :event_date, location = :location, type = :type, status = :status
                 WHERE institution_id = :inst AND id = :id',
            );
            $stmt->execute([
                'slug' => $input['slug'],
                'title' => $input['title'],
                'summary' => $input['summary'] !== '' ? $input['summary'] : null,
                'content' => $input['content'] !== '' ? $input['content'] : null,
                'event_date' => $input['eventDate'],
                'location' => $input['location'] !== '' ? $input['location'] : null,
                'type' => $input['type'] !== '' ? $input['type'] : null,
                'status' => $input['status'],
                'inst' => Db::institutionId(),
                'id' => $id,
            ]);
        } catch (PDOException $e) {
            if (is_duplicate_key($e)) {
                json_error(409, 'CONFLICT', 'An event with this slug already exists.');
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
            json_error(404, 'NOT_FOUND', 'Event not found.');
        }
        $stmt = Db::pdo()->prepare(
            'UPDATE events SET status = \'archived\' WHERE institution_id = :inst AND id = :id',
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
            'SELECT id, slug, title, summary, content, event_date, location, type, status, created_at, updated_at
             FROM events WHERE institution_id = :inst AND id = :id LIMIT 1',
        );
        $stmt->execute(['inst' => Db::institutionId(), 'id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{title:string,slug:string,summary:string,content:string,eventDate:string,location:string,type:string,status:string}
     */
    private static function validateBody(array $body): array
    {
        $title = trim((string) ($body['title'] ?? ''));
        $slug = normalize_slug((string) ($body['slug'] ?? ''));
        $summary = trim((string) ($body['summary'] ?? ''));
        $content = trim((string) ($body['content'] ?? ''));
        $location = trim((string) ($body['location'] ?? ''));
        $type = trim((string) ($body['type'] ?? ''));
        $status = require_content_status($body['status'] ?? 'draft');
        $eventDate = parse_event_date_utc((string) ($body['eventDate'] ?? ''));

        if ($title === '') {
            json_error(400, 'VALIDATION', 'Title is required.');
        }
        if ($slug === '') {
            json_error(400, 'VALIDATION', 'Slug is required.');
        }
        if (!is_valid_slug($slug)) {
            json_error(400, 'VALIDATION', 'Slug must use lowercase letters, numbers, and hyphens only.');
        }

        return compact('title', 'slug', 'summary', 'content', 'eventDate', 'location', 'type', 'status');
    }

    /**
     * @param array<string, mixed>|null $row
     * @return array<string, mixed>
     */
    private static function shape(?array $row): array
    {
        if ($row === null) {
            json_error(500, 'DB', 'Event row missing after write.');
        }
        return [
            'id' => (string) $row['id'],
            'slug' => (string) $row['slug'],
            'title' => (string) $row['title'],
            'summary' => $row['summary'] !== null ? (string) $row['summary'] : null,
            'content' => $row['content'] !== null ? (string) $row['content'] : null,
            'eventDate' => iso_utc((string) $row['event_date']),
            'location' => $row['location'] !== null ? (string) $row['location'] : null,
            'type' => $row['type'] !== null ? (string) $row['type'] : null,
            'status' => (string) $row['status'],
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
