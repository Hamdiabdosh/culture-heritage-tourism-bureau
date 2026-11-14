<?php
declare(strict_types=1);

// Built-in PHP server router for local Docker.
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false;
}
require __DIR__ . '/index.php';
