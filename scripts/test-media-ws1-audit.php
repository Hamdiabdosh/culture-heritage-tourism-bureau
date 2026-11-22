#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Phase 2.3 WS1 audit corrections — memory, animation parsers, storage paths.
 * Run: docker compose exec -T api php /var/www/backend/../scripts/test-media-ws1-audit.php
 * (script lives on host; copy into container bind via backend/tmp or mount).
 *
 * Preferred: docker compose exec -T api php /var/www/backend/tmp/test-media-ws1-audit.php
 */

$backend = getenv('EGWP_BACKEND') ?: '/var/www/backend';
require_once $backend . '/app/helpers.php';
spl_autoload_register(static function (string $class) use ($backend): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $path = $backend . '/app/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($path)) {
        require_once $path;
    }
});

use App\Media\ImageProcessor;
use App\Media\ImageProcessingException;
use App\Media\StoragePaths;

$passed = 0;
$fixDir = $backend . '/tmp/media-ws1-audit';
@mkdir($fixDir, 0777, true);

function check(string $label, bool $ok, mixed $detail = null): void
{
    global $passed;
    if (!$ok) {
        fwrite(STDERR, "FAIL {$label}" . ($detail !== null ? ' — ' . json_encode($detail) : '') . PHP_EOL);
        exit(1);
    }
    $passed++;
    echo "OK   {$label}" . PHP_EOL;
}

// --- Memory helpers ---
$peak = ImageProcessor::estimatePeakImageBytes(8000, 3000); // 24 MP
$need = ImageProcessor::requiredMemoryBytes(8000, 3000);
check('peak bytes > one frame', $peak >= 8000 * 3000 * 4);
check('required includes overhead', $need === $peak + ImageProcessor::MEMORY_OVERHEAD_BYTES);
check('256M covers D15 peak', ImageProcessor::parseIniBytes('256M') >= $need);
check('parseIniBytes 128M', ImageProcessor::parseIniBytes('128M') === 128 * 1024 * 1024);
check('parseIniBytes unlimited', ImageProcessor::parseIniBytes('-1') === -1);

// Ensure limit applies and reads back
$prev = ini_get('memory_limit');
ini_set('memory_limit', '128M');
$restored = ImageProcessor::ensureUploadMemoryLimit(100, 100);
check('ensure raises from 128M', ImageProcessor::parseIniBytes((string) ini_get('memory_limit')) >= ImageProcessor::parseIniBytes('256M'));
ini_set('memory_limit', $restored);

// Simulate failure
ImageProcessor::$simulateMemoryLimitFailure = true;
$threw = false;
try {
    ImageProcessor::ensureUploadMemoryLimit(10, 10);
} catch (ImageProcessingException $e) {
    $threw = $e->status === 503;
    check('memory failure status 503', $e->status === 503, $e->getMessage());
}
ImageProcessor::$simulateMemoryLimitFailure = false;
check('memory failure threw', $threw);
ini_set('memory_limit', (string) $prev);

// --- Animation / malformed ---
$staticGif = $fixDir . '/static.gif';
$im = imagecreatetruecolor(8, 8);
imagegif($im, $staticGif);
imagedestroy($im);
check('static GIF false', ImageProcessor::gifIsAnimated($staticGif) === false);

// Truncated GIF (header only)
$truncGif = $fixDir . '/trunc.gif';
file_put_contents($truncGif, 'GIF89a' . str_repeat("\0", 7));
check('truncated GIF null', ImageProcessor::gifIsAnimated($truncGif) === null);

// GIF missing trailer: take static and strip final 0x3B if present
$noTrail = $fixDir . '/notrail.gif';
$g = file_get_contents($staticGif);
if ($g !== false && str_ends_with($g, ";")) {
    file_put_contents($noTrail, substr($g, 0, -1));
} else {
    file_put_contents($noTrail, $g === false ? '' : $g);
}
check('GIF without trailer null', ImageProcessor::gifIsAnimated($noTrail) === null);

// Animated GIF (2 frames) — minimal well-formed
$animGif = $fixDir . '/anim.gif';
file_put_contents($animGif, hex2bin(
    '47494638396101000100000000'
    . '21f9040500000000'
    . '2c00000000010001000002014400'
    . '21f9040500000000'
    . '2c00000000010001000002014400'
    . '3b'
));
check('animated GIF true', ImageProcessor::gifIsAnimated($animGif) === true);

// Incomplete image sub-blocks (descriptor then cut)
$badSub = $fixDir . '/badsub.gif';
file_put_contents($badSub, hex2bin(
    '47494638396101000100000000'
    . '2c00000000010001000002' // descriptor + LZW size, no sub-blocks/trailer
));
check('GIF incomplete sub-blocks null', ImageProcessor::gifIsAnimated($badSub) === null);

// WebP static via GD
$staticWebp = $fixDir . '/static.webp';
$im = imagecreatetruecolor(8, 8);
imagewebp($im, $staticWebp, 80);
imagedestroy($im);
check('static WebP false', ImageProcessor::webpIsAnimated($staticWebp) === false);

// Truncated WebP (RIFF claims larger size)
$raw = file_get_contents($staticWebp);
check('have static webp bytes', $raw !== false && strlen($raw) > 20);
$truncWebp = $fixDir . '/trunc.webp';
file_put_contents($truncWebp, substr($raw, 0, 20));
check('truncated WebP null', ImageProcessor::webpIsAnimated($truncWebp) === null);

// RIFF size mismatch (lie about size)
$lie = $fixDir . '/lie.webp';
$lieBody = $raw;
$lieBody[4] = "\xFF";
$lieBody[5] = "\xFF";
file_put_contents($lie, $lieBody);
check('WebP RIFF size mismatch null', ImageProcessor::webpIsAnimated($lie) === null);

// Animated WebP VP8X+ANIM with correct RIFF size
$vp8x = "\x12\x00\x00\x00\x00\x00\x00\x00\x00\x00";
$anim = 'ANIM' . pack('V', 6) . "\x00\x00\x00\x00\x00\x00";
$body = 'VP8X' . pack('V', strlen($vp8x)) . $vp8x . $anim;
$animWebp = 'RIFF' . pack('V', 4 + strlen($body)) . 'WEBP' . $body;
file_put_contents($fixDir . '/anim.webp', $animWebp);
check('animated WebP true', ImageProcessor::webpIsAnimated($fixDir . '/anim.webp') === true);

// APNG
$png = $fixDir . '/static.png';
$im = imagecreatetruecolor(4, 4);
imagepng($im, $png);
imagedestroy($im);
check('static PNG false', ImageProcessor::pngIsAnimated($png) === false);

// --- assertStatic rejects uncertain before decode (processUpload) ---
$rejected = false;
try {
    ImageProcessor::processUpload($truncGif);
} catch (ImageProcessingException $e) {
    $rejected = $e->status === 400;
}
check('processUpload rejects truncated GIF before decode', $rejected);

// --- EXIF orientation 6: wide image becomes tall ---
$exifSrc = $fixDir . '/orient_src.jpg';
$im = imagecreatetruecolor(40, 20);
$red = imagecolorallocate($im, 255, 0, 0);
imagefilledrectangle($im, 0, 0, 39, 19, $red);
imagejpeg($im, $exifSrc, 90);
imagedestroy($im);
$oriented = $fixDir . '/orient6.jpg';
jpeg_inject_orientation($exifSrc, $oriented, 6);
$exif = @exif_read_data($oriented);
check('fixture has Orientation 6', is_array($exif) && (int) ($exif['Orientation'] ?? 0) === 6, $exif);
$out = ImageProcessor::processUpload($oriented);
check('EXIF rotate dimensions', $out['width'] === 20 && $out['height'] === 40, $out);
@unlink($out['tmp_path']);

// --- Max-size accepted (near D15, under 5MB file) ---
@ini_set('memory_limit', '512M');
$maxPath = $fixDir . '/max_accept.jpg';
// 4000×6000 = 24 MP; solid JPEG compresses well under 5 MB.
$im = imagecreatetruecolor(4000, 6000);
$c = imagecolorallocate($im, 10, 20, 30);
imagefilledrectangle($im, 0, 0, 3999, 5999, $c);
imagejpeg($im, $maxPath, 40);
imagedestroy($im);
$maxBytes = filesize($maxPath);
check('max fixture under 5MB', $maxBytes !== false && $maxBytes <= ImageProcessor::MAX_BYTES, $maxBytes);
$out = ImageProcessor::processUpload($maxPath);
check('max accepted re-encodes', $out['width'] <= ImageProcessor::MAX_STORED_EDGE_PX && $out['height'] <= ImageProcessor::MAX_STORED_EDGE_PX, $out);
@unlink($out['tmp_path']);

// --- Storage paths / symlink ---
$doc = StoragePaths::documentRoot();
check('docroot is public', str_ends_with(str_replace('\\', '/', $doc), '/public'));
$uploads = StoragePaths::ensureWritableOutsideDocRoot(StoragePaths::uploads(), 'uploads');
check('uploads outside docroot', !str_starts_with($uploads, rtrim($doc, '/') . '/'));

$linkParent = $fixDir . '/linkroot';
@mkdir($linkParent, 0777, true);
$realTarget = $fixDir . '/real_uploads';
@mkdir($realTarget, 0777, true);
$link = $linkParent . '/uploads_link';
@unlink($link);
if (!@symlink($realTarget, $link)) {
    echo "SKIP symlink test (symlink not permitted)" . PHP_EOL;
} else {
    $resolved = StoragePaths::ensureWritableOutsideDocRoot($link, 'symlink-uploads');
    check('symlink resolves outside docroot', $resolved === realpath($realTarget));
    // Symlink that points inside public must fail
    $badLink = $fixDir . '/bad_public_link';
    @unlink($badLink);
    if (@symlink($doc, $badLink)) {
        $failed = false;
        try {
            StoragePaths::ensureWritableOutsideDocRoot($badLink, 'bad-link');
        } catch (ImageProcessingException $e) {
            $failed = true;
        }
        check('symlink into docroot rejected', $failed);
    }
}

echo PHP_EOL . "PASSED {$passed} audit checks" . PHP_EOL;
exit(0);

/**
 * Insert a minimal EXIF Orientation tag into a JPEG (APP1 after SOI).
 */
function jpeg_inject_orientation(string $src, string $dest, int $orientation): void
{
    $jpeg = file_get_contents($src);
    if ($jpeg === false || !str_starts_with($jpeg, "\xFF\xD8")) {
        throw new RuntimeException('bad jpeg');
    }
    // TIFF IFD with one SHORT tag Orientation=0x0112
    $tiff = 'II' . pack('v', 42) . pack('V', 8); // little-endian, magic, IFD offset
    $tiff .= pack('v', 1); // 1 entry
    $tiff .= pack('v', 0x0112) . pack('v', 3) . pack('V', 1) . pack('V', $orientation);
    $tiff .= pack('V', 0); // next IFD
    $exif = "Exif\0\0" . $tiff;
    $app1 = "\xFF\xE1" . pack('n', strlen($exif) + 2) . $exif;
    file_put_contents($dest, "\xFF\xD8" . $app1 . substr($jpeg, 2));
}
