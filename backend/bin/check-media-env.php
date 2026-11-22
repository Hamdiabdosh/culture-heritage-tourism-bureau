#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Preflight: GD/exif codecs + configured storage paths outside the document root.
 * Loads backend/config/config.php when present (same paths as the API).
 * Usage: php bin/check-media-env.php
 * Exit 0 = ready; 1 = not ready.
 *
 * Note: .htaccess is Apache defence-in-depth only. nginx/php built-in security
 * depends on the document root excluding storage (verified below).
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
use App\Media\ImageProcessingException;
use App\Media\StoragePaths;

$ok = true;
$configFile = $root . '/config/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, 'WARN config.php missing — using default storage paths under backend/' . PHP_EOL);
} else {
    echo 'OK   config.php loaded for path resolution' . PHP_EOL;
}

$caps = ImageProcessor::capabilities();
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

$doc = StoragePaths::documentRoot();
echo 'OK   document_root: ' . $doc . PHP_EOL;

foreach (StoragePaths::all() as $entry) {
    $label = $entry['label'];
    $path = $entry['path'];
    try {
        $real = StoragePaths::ensureWritableOutsideDocRoot($path, $label);
        echo "OK   {$label}: {$path}" . ($real !== $path ? " → {$real}" : '') . PHP_EOL;
    } catch (ImageProcessingException $e) {
        $ok = false;
        fwrite(STDERR, "FAIL {$label}: {$e->getMessage()} ({$path})" . PHP_EOL);
    }
}

// Memory constants sanity vs D15 peak
$peak = ImageProcessor::estimatePeakImageBytes(4898, 4898); // ≈24 MP square
$need = ImageProcessor::requiredMemoryBytes(4898, 4898);
$limit = ImageProcessor::parseIniBytes(ImageProcessor::UPLOAD_MEMORY_LIMIT);
if ($limit >= 0 && $limit < $need) {
    $ok = false;
    fwrite(STDERR, "FAIL memory: UPLOAD_MEMORY_LIMIT {$limit} < required {$need} (peak buffers {$peak})" . PHP_EOL);
} else {
    echo 'OK   memory budget: D15 peak≈' . (int) round($peak / 1048576) . 'MiB buffers + overhead; limit='
        . ImageProcessor::UPLOAD_MEMORY_LIMIT . PHP_EOL;
}

$deny = $root . '/storage/.htaccess';
if (!is_file($deny)) {
    fwrite(STDERR, 'WARN storage/.htaccess missing (Apache defence-in-depth only; nginx must keep storage outside docroot)' . PHP_EOL);
} else {
    echo 'OK   storage/.htaccess present (Apache only; not an nginx boundary)' . PHP_EOL;
}

exit($ok ? 0 : 1);
