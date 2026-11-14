<?php
declare(strict_types=1);

namespace App\Policies;

use App\Auth;

/**
 * Role + publishing gate — mirrors lib/authz.ts.
 */
final class ContentPolicy
{
    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireSession(): array
    {
        $user = Auth::user();
        if ($user === null) {
            json_error(401, 'UNAUTHORIZED', 'Sign in required.');
        }
        return $user;
    }

    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireViewer(): array
    {
        return self::requireSession();
    }

    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireEditor(): array
    {
        $user = self::requireSession();
        if (!self::canModify($user['role'])) {
            json_error(403, 'FORBIDDEN', 'Your role cannot modify content.');
        }
        return $user;
    }

    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireAdmin(): array
    {
        $user = self::requireSession();
        if ($user['role'] !== 'admin') {
            json_error(403, 'FORBIDDEN', 'Only administrators can manage users.');
        }
        return $user;
    }

    public static function canModify(string $role): bool
    {
        return $role === 'admin' || $role === 'editor';
    }

    public static function canPublish(string $role): bool
    {
        return $role === 'admin';
    }

    /**
     * Editors cannot publish or silently edit live published content.
     *
     * @param 'draft'|'published'|'archived' $requested
     * @param 'draft'|'published'|'archived'|null $existing
     * @return 'draft'|'published'|'archived'
     */
    public static function enforcePublishingGate(
        string $role,
        string $requested,
        ?string $existing = null,
    ): string {
        if (self::canPublish($role)) {
            return $requested;
        }
        if ($requested === 'published' || $existing === 'published') {
            return 'draft';
        }
        return $requested;
    }
}
