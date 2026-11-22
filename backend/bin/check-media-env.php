#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Preflight: GD/exif codecs + writable storage outside the document root.
 * Usage: php bin/check-media-env.php
 * Exit 0 = ready; 1 = not ready.
 */

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

use App\Media\ImageProcessor;

$caps = ImageProcessor::capabilities();
$docRoot = realpath($root . '/public') ?: ($root . '/public');
$dirs = [
    'uploads' => $root . '/storage/uploads',
    'quarantine' => $root . '/storage/quarantine',
    'backfill-originals' => $root . '/storage/backfill-originals',
];

$ok = true;
if ($caps['ok'] !== true) {
    $ok = false;
    fwrite(STDERR, 'FAIL codecs: missing ' . implode(', ', $caps['missing']) . PHP_EOL);
} else {
    echo 'OK   codecs: ' . implode(', ', $caps['formats']) . PHP_EOL;
    if (function_exists('gd_info')) {
        $gi = gd_info();
        echo 'OK   gd_info JPEG=' . (!empty($gi['JPEG Support']) || !empty($gi['JPG Support']) ? 'yes' : 'no')
            . ' PNG=' . (!empty($gi['PNG Support']) ? 'yes' : 'no')
            . ' WebP=' . (!empty($gi['WebP Support']) ? 'yes' : 'no')
            . ' GIF_read=' . (!empty($gi['GIF Read Support']) ? 'yes' : 'no')
            . ' GIF_create=' . (!empty($gi['GIF Create Support']) ? 'yes' : 'no')
            . PHP_EOL;
    }
}

foreach ($dirs as $label => $dir) {
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        $ok = false;
        fwrite(STDERR, "FAIL {$label}: cannot create {$dir}" . PHP_EOL);
        continue;
    }
    if (!is_writable($dir)) {
        $ok = false;
        fwrite(STDERR, "FAIL {$label}: not writable {$dir}" . PHP_EOL);
        continue;
    }
    $real = realpath($dir);
    if ($real !== false && str_starts_with($real, rtrim($docRoot, '/'))) {
        $ok = false;
        fwrite(STDERR, "FAIL {$label}: inside document root ({$real})" . PHP_EOL);
        continue;
    }
    echo "OK   {$label}: {$dir}" . PHP_EOL;
}

$deny = $root . '/storage/.htaccess';
if (!is_file($deny)) {
    $ok = false;
    fwrite(STDERR, 'FAIL storage/.htaccess missing' . PHP_EOL);
} else {
    echo 'OK   storage/.htaccess present' . PHP_EOL;
}

exit($ok ? 0 : 1);
