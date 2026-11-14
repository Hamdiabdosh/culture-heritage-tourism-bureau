<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Db;
use App\Policies\ContentPolicy;

final class UsersController
{
    private const ROLES = ['admin', 'editor', 'viewer'];

    /** @param array<string, string> $_params */
    public static function cmsList(array $_params = []): void
    {
        ContentPolicy::requireAdmin();
        $stmt = Db::pdo()->query(
            'SELECT id, name, email, role, active, created_at, updated_at
             FROM users ORDER BY created_at ASC',
        );
        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = self::shape($row);
        }
        json_response(200, ['items' => $items]);
    }

    /** @param array<string, string> $params */
    public static function cmsUpdate(array $params = []): void
    {
        $actor = ContentPolicy::requireAdmin();
        $id = $params['id'] ?? '';
        if ($id === '') {
            json_error(400, 'VALIDATION', 'Missing user id.');
        }

        $existing = self::findById($id);
        if (!$existing) {
            json_error(404, 'NOT_FOUND', 'User not found.');
        }

        $body = json_body();
        $hasRole = array_key_exists('role', $body);
        $hasActive = array_key_exists('active', $body);
        if (!$hasRole && !$hasActive) {
            json_error(400, 'VALIDATION', 'Provide role and/or active.');
        }

        $role = (string) $existing['role'];
        $active = (int) $existing['active'] === 1;

        if ($hasRole) {
            $roleRaw = (string) $body['role'];
            if (!in_array($roleRaw, self::ROLES, true)) {
                json_error(400, 'VALIDATION', 'Invalid role.');
            }
            $role = $roleRaw;
        }

        if ($hasActive) {
            if (!is_bool($body['active']) && $body['active'] !== 0 && $body['active'] !== 1
                && $body['active'] !== '0' && $body['active'] !== '1' && $body['active'] !== 'true'
                && $body['active'] !== 'false') {
                json_error(400, 'VALIDATION', 'Invalid active flag.');
            }
            $active = filter_var($body['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($active === null) {
                // Accept 0/1 ints from JSON as bool already handled; strict reject otherwise.
                if ($body['active'] === 0 || $body['active'] === 1) {
                    $active = (bool) $body['active'];
                } else {
                    json_error(400, 'VALIDATION', 'Invalid active flag.');
                }
            }
        }

        $change = [];
        if ($hasRole) {
            $change['role'] = $role;
        }
        if ($hasActive) {
            $change['active'] = $active;
        }

        if (self::wouldRemoveLastActiveAdmin($existing, $change)) {
            json_error(409, 'CONFLICT', 'Cannot remove or demote the last active administrator.');
        }

        // No-op updates still return current user.
        $pdo = Db::pdo();
        if ($hasRole) {
            $stmt = $pdo->prepare('UPDATE users SET role = :role WHERE id = :id');
            $stmt->execute(['role' => $role, 'id' => $id]);
        }
        if ($hasActive) {
            $stmt = $pdo->prepare('UPDATE users SET active = :active WHERE id = :id');
            $stmt->execute(['active' => $active ? 1 : 0, 'id' => $id]);
            if (!$active) {
                $del = $pdo->prepare('DELETE FROM session WHERE user_id = :id');
                $del->execute(['id' => $id]);
                if ($actor['id'] === $id) {
                    Auth::logout();
                }
            }
        }

        $row = self::findById($id);
        json_response(200, self::shape($row ?? $existing));
    }

    /**
     * @param array<string, mixed> $user
     * @param array{role?:string,active?:bool} $change
     */
    private static function wouldRemoveLastActiveAdmin(array $user, array $change): bool
    {
        if ((string) $user['role'] !== 'admin' || (int) $user['active'] !== 1) {
            return false;
        }

        $demoting = isset($change['role']) && $change['role'] !== 'admin';
        $deactivating = array_key_exists('active', $change) && $change['active'] === false;
        if (!$demoting && !$deactivating) {
            return false;
        }

        $stmt = Db::pdo()->query(
            "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1",
        );
        $count = (int) ($stmt->fetch()['c'] ?? 0);
        return $count <= 1;
    }

    /** @return array<string, mixed>|null */
    private static function findById(string $id): ?array
    {
        $stmt = Db::pdo()->prepare(
            'SELECT id, name, email, role, active, created_at, updated_at
             FROM users WHERE id = :id LIMIT 1',
        );
        $stmt->execute(['id' => $id]);
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
            'email' => (string) $row['email'],
            'role' => (string) $row['role'],
            'active' => (int) $row['active'] === 1,
            'createdAt' => iso_utc((string) ($row['created_at'] ?? '')),
            'updatedAt' => iso_utc((string) ($row['updated_at'] ?? '')),
        ];
    }
}
