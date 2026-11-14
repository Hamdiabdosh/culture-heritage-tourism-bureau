<?php
declare(strict_types=1);

/**
 * Front controller for /api/*
 * Deploy as public_html/api/index.php (see backend/README.md).
 */

header('Content-Type: application/json; charset=utf-8');

$root = dirname(__DIR__);

require_once $root . '/app/helpers.php';

spl_autoload_register(static function (string $class) use ($root): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $path = $root . '/app/' . $relative . '.php';
    if (is_file($path)) {
        require_once $path;
    }
});

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// Prefer path info / rewrite query; fall back to parsing REQUEST_URI.
$path = $_GET['__path'] ?? '';
if ($path === '' || $path === false) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    // Strip /api prefix when front controller lives under /api/
    if (str_starts_with($uri, '/api')) {
        $uri = substr($uri, 4) ?: '/';
    }
    $path = $uri;
}
$path = '/' . trim((string) $path, '/');
if ($path !== '/') {
    $path = rtrim($path, '/') ?: '/';
}

// Double-submit CSRF cookie on every response; enforce on mutations (not login).
\App\Csrf::touch();
$mutating = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);
$csrfExempt = $path === '/auth/login';
if ($mutating && !$csrfExempt) {
    \App\Csrf::requireValid();
}

/** @var list<array{method:string,pattern:string,handler:callable}> $routes */
$routes = require $root . '/routes/api.php';

foreach ($routes as $route) {
    if (strtoupper($route['method']) !== $method) {
        continue;
    }
    $params = match_route($route['pattern'], $path);
    if ($params === null) {
        continue;
    }
    ($route['handler'])($params);
    exit;
}

json_error(404, 'NOT_FOUND', 'No route matched.');
