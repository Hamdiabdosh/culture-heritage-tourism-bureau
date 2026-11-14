<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Policies\ContentPolicy;

/** Thin alias — prefer ContentPolicy in controllers. */
final class AuthMiddleware
{
    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireViewer(): array
    {
        return ContentPolicy::requireViewer();
    }

    /** @return array{id:string,name:string,email:string,role:string,active:int} */
    public static function requireEditor(): array
    {
        return ContentPolicy::requireEditor();
    }
}
