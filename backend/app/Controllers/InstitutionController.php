<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;

final class InstitutionController
{
    /** @param array<string, string> $_params */
    public static function show(array $_params = []): void
    {
        $row = self::fetch();
        if (!$row) {
            json_error(404, 'NOT_FOUND', 'Institution not found.');
        }
        json_response(200, self::shape($row));
    }

    /** CMS: editors may update visitor-facing institution fields. */
    /** @param array<string, string> $_params */
    public static function cmsUpdate(array $_params = []): void
    {
        ContentPolicy::requireEditor();
        $existing = self::fetch();
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'Institution not found.');
        }

        $body = json_body();
        $name = trim((string) ($body['name'] ?? ''));
        $shortName = trim((string) ($body['shortName'] ?? ''));
        if ($name === '') {
            json_error(400, 'VALIDATION', 'Name is required.');
        }
        if ($shortName === '') {
            json_error(400, 'VALIDATION', 'Short name is required.');
        }

        $nullable = static function (mixed $v): ?string {
            $s = trim((string) ($v ?? ''));
            return $s !== '' ? $s : null;
        };

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
               hours = :hours
             WHERE id = :id',
        );
        $stmt->execute([
            'name' => $name,
            'short_name' => $shortName,
            'tagline' => $nullable($body['tagline'] ?? null),
            'description' => $nullable($body['description'] ?? null),
            'eyebrow' => $nullable($body['eyebrow'] ?? null),
            'address' => $nullable($body['address'] ?? null),
            'phone' => $nullable($body['phone'] ?? null),
            'email' => $nullable($body['email'] ?? null),
            'hours' => $nullable($body['hours'] ?? null),
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
            'SELECT id, name, short_name, tagline, description, eyebrow, address, phone, email, hours
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
            'tagline' => $row['tagline'] !== null ? (string) $row['tagline'] : null,
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'eyebrow' => $row['eyebrow'] !== null ? (string) $row['eyebrow'] : null,
            'address' => $row['address'] !== null ? (string) $row['address'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'hours' => $row['hours'] !== null ? (string) $row['hours'] : null,
        ];
    }
}
