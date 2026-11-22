<?php
declare(strict_types=1);

namespace App\Media;

/**
 * Server-side image validation + mandatory GD re-encoding (Phase 2.3 WS1).
 *
 * Memory budget (D15 preserved: ≤24 MP, ≤8,000 px/edge, store ≤2,560 px):
 *
 * Peak GD RAM for an accepted upload (RGBA, 4 bytes/pixel):
 * - Decode holds one full-frame buffer: W×H×4.
 * - EXIF imagerotate may briefly hold source + rotated ≈ 2×W×H×4.
 * - Resize (when longest edge > 2,560) holds source + destination concurrently.
 * - Worst-case peak ≈ max(2×src, src+dst) bytes of image buffers.
 * - Plus ~32 MB PHP/finfo/temp overhead → required request limit.
 *
 * Example at the D15 ceiling (≈24e6 px):
 * - src ≈ 96 MB; rotate peak ≈ 192 MB; resize to 2560 edge adds a smaller dest.
 * - Request limit UPLOAD_MEMORY_LIMIT (256M) must be successfully applied and
 *   read back before decode; otherwise fail closed (503).
 *
 * Concurrent workers: each in-flight upload may need ~200–256 MB. A host with
 * N PHP workers should provision ≈ N × 256 MB RAM for media, or reduce workers /
 * queue uploads. Do not rely on OOM as validation.
 *
 * ponytail: animation detectors are strict byte parsers; incomplete/ambiguous
 * containers return null → reject before GD (fail closed).
 */
final class ImageProcessor
{
    public const MAX_BYTES = 5_242_880; // 5 MB
    public const MAX_MEGAPIXELS = 24;
    public const MAX_EDGE_PX = 8_000;
    public const MAX_STORED_EDGE_PX = 2_560;
    public const JPEG_QUALITY = 85;
    public const WEBP_QUALITY = 85;
    public const PNG_COMPRESSION = 6;
    public const UPLOAD_MEMORY_LIMIT = '256M';
    /** Extra headroom above image-buffer peak for PHP runtime. */
    public const MEMORY_OVERHEAD_BYTES = 33_554_432; // 32 MiB

    /**
     * Test-only: when true, ensureUploadMemoryLimit() fails closed.
     * Never enable in production.
     */
    public static bool $simulateMemoryLimitFailure = false;

    /** MIME → stored extension. */
    private const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /** @var array<int, string> IMAGETYPE_* → canonical mime */
    private const IMAGETYPE_MIME = [
        IMAGETYPE_JPEG => 'image/jpeg',
        IMAGETYPE_PNG => 'image/png',
        IMAGETYPE_WEBP => 'image/webp',
        IMAGETYPE_GIF => 'image/gif',
    ];

    /**
     * @return array{ok:true,formats:list<string>}|array{ok:false,missing:list<string>}
     */
    public static function capabilities(): array
    {
        $missing = [];
        if (!extension_loaded('gd')) {
            $missing[] = 'gd';
        }
        if (!extension_loaded('exif')) {
            $missing[] = 'exif';
        }
        foreach ([
            'imagecreatefromjpeg',
            'imagecreatefrompng',
            'imagecreatefromwebp',
            'imagecreatefromgif',
            'imagejpeg',
            'imagepng',
            'imagewebp',
            'imagegif',
        ] as $fn) {
            if (!function_exists($fn)) {
                $missing[] = $fn;
            }
        }
        if ($missing !== []) {
            return ['ok' => false, 'missing' => array_values(array_unique($missing))];
        }

        $info = function_exists('gd_info') ? gd_info() : [];
        $formats = [];
        if (!empty($info['JPEG Support']) || !empty($info['JPG Support'])) {
            $formats[] = 'jpeg';
        }
        if (!empty($info['PNG Support'])) {
            $formats[] = 'png';
        }
        if (!empty($info['WebP Support'])) {
            $formats[] = 'webp';
        }
        if (!empty($info['GIF Read Support']) && !empty($info['GIF Create Support'])) {
            $formats[] = 'gif';
        }
        foreach (['jpeg', 'png', 'webp', 'gif'] as $f) {
            if (!in_array($f, $formats, true)) {
                $missing[] = 'gd:' . $f;
            }
        }
        if ($missing !== []) {
            return ['ok' => false, 'missing' => array_values(array_unique($missing))];
        }

        return ['ok' => true, 'formats' => $formats];
    }

    public static function isAvailable(): bool
    {
        $caps = self::capabilities();
        return $caps['ok'] === true;
    }

    /**
     * Estimate peak image-buffer bytes for decode + optional EXIF rotate + resize.
     */
    public static function estimatePeakImageBytes(int $width, int $height): int
    {
        $src = self::frameBytes($width, $height);
        // Orientation 5–8 swap edges; peak during rotate ≈ 2× source frame.
        $rotatePeak = 2 * $src;

        $longest = max($width, $height);
        $dstW = $width;
        $dstH = $height;
        if ($longest > self::MAX_STORED_EDGE_PX) {
            $scale = self::MAX_STORED_EDGE_PX / $longest;
            $dstW = max(1, (int) round($width * $scale));
            $dstH = max(1, (int) round($height * $scale));
        }
        $resizePeak = $src + self::frameBytes($dstW, $dstH);

        return max($rotatePeak, $resizePeak);
    }

    public static function requiredMemoryBytes(int $width, int $height): int
    {
        return self::estimatePeakImageBytes($width, $height) + self::MEMORY_OVERHEAD_BYTES;
    }

    /**
     * Raise and verify the upload memory limit. Returns the previous limit string
     * for restoration. Fails closed if the effective limit is insufficient.
     */
    public static function ensureUploadMemoryLimit(int $width, int $height): string
    {
        if (self::$simulateMemoryLimitFailure) {
            throw new ImageProcessingException(
                503,
                'UNAVAILABLE',
                'Image processing memory limit could not be established.'
            );
        }

        $required = self::requiredMemoryBytes($width, $height);
        $previous = (string) ini_get('memory_limit');
        $target = self::UPLOAD_MEMORY_LIMIT;
        $targetBytes = self::parseIniBytes($target);

        if ($targetBytes < $required) {
            // Defensive: constants must always cover D15 peak; treat as misconfiguration.
            throw new ImageProcessingException(
                503,
                'UNAVAILABLE',
                'Image processing memory limit could not be established.'
            );
        }

        $currentBytes = self::parseIniBytes($previous);
        if ($currentBytes >= 0 && $currentBytes < $targetBytes) {
            $set = ini_set('memory_limit', $target);
            if ($set === false) {
                throw new ImageProcessingException(
                    503,
                    'UNAVAILABLE',
                    'Image processing memory limit could not be established.'
                );
            }
        }

        $effective = self::parseIniBytes((string) ini_get('memory_limit'));
        // unlimited (-1) is acceptable; otherwise must meet required peak.
        if ($effective >= 0 && $effective < $required) {
            throw new ImageProcessingException(
                503,
                'UNAVAILABLE',
                'Image processing memory limit could not be established.'
            );
        }

        return $previous;
    }

    /**
     * Parse PHP ini memory shorthand to bytes. -1 means unlimited.
     */
    public static function parseIniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return -1;
        }
        if (!preg_match('/^(\d+)\s*([KMG])?B?$/i', $value, $m)) {
            // Numeric plain bytes
            if (ctype_digit($value)) {
                return (int) $value;
            }
            return 0;
        }
        $n = (int) $m[1];
        $unit = strtoupper($m[2] ?? '');
        return match ($unit) {
            'G' => $n * 1024 * 1024 * 1024,
            'M' => $n * 1024 * 1024,
            'K' => $n * 1024,
            default => $n,
        };
    }

    /**
     * Validate + re-encode an uploaded temp file. Caller must have already
     * checked is_uploaded_file and byte size.
     *
     * @return array{ext:string,mime:string,width:int,height:int,bytes:int,sha256:string,tmp_path:string}
     */
    public static function processUpload(string $tmpPath): array
    {
        if (!is_file($tmpPath) || !is_readable($tmpPath)) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Upload failed. Try again.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) ($finfo->file($tmpPath) ?: ''));
        if (!isset(self::ALLOWED[$mime])) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Use a JPEG, PNG, WebP, or GIF image.');
        }
        $canonicalMime = self::normalizeMime($mime);
        $ext = self::ALLOWED[$mime];

        $info = @getimagesize($tmpPath);
        if ($info === false || !isset($info[0], $info[1], $info[2])) {
            throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
        }
        $width = (int) $info[0];
        $height = (int) $info[1];
        $imageType = (int) $info[2];
        $typeMime = self::IMAGETYPE_MIME[$imageType] ?? null;
        if ($typeMime === null || $typeMime !== $canonicalMime) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Use a JPEG, PNG, WebP, or GIF image.');
        }
        if ($width < 1 || $height < 1) {
            throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
        }
        if ($width > self::MAX_EDGE_PX || $height > self::MAX_EDGE_PX) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Image dimensions are too large (max 8,000 pixels per side).');
        }
        if (($width * $height) / 1_000_000 > self::MAX_MEGAPIXELS) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Image is too large (max 24 megapixels).');
        }

        // Animation / container integrity — reject before any GD decode.
        self::assertStatic($tmpPath, $canonicalMime);

        $previousLimit = self::ensureUploadMemoryLimit($width, $height);

        $image = null;
        $outPath = null;
        try {
            $image = self::decode($tmpPath, $canonicalMime);
            if ($canonicalMime === 'image/jpeg') {
                $image = self::applyExifOrientation($tmpPath, $image);
            }

            $srcW = imagesx($image);
            $srcH = imagesy($image);
            if ($srcW < 1 || $srcH < 1) {
                throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
            }

            $longest = max($srcW, $srcH);
            if ($longest > self::MAX_STORED_EDGE_PX) {
                $scale = self::MAX_STORED_EDGE_PX / $longest;
                $dstW = max(1, (int) round($srcW * $scale));
                $dstH = max(1, (int) round($srcH * $scale));
                $resized = imagecreatetruecolor($dstW, $dstH);
                if ($resized === false) {
                    throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
                }
                self::preserveAlpha($resized, $canonicalMime);
                if (!imagecopyresampled($resized, $image, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH)) {
                    imagedestroy($resized);
                    throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
                }
                imagedestroy($image);
                $image = $resized;
            }

            $outPath = tempnam(sys_get_temp_dir(), 'egwpimg');
            if ($outPath === false) {
                throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
            }
            self::encode($image, $outPath, $canonicalMime);
            imagedestroy($image);
            $image = null;

            $outInfo = @getimagesize($outPath);
            if ($outInfo === false || (int) ($outInfo[0] ?? 0) < 1 || (int) ($outInfo[1] ?? 0) < 1) {
                throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
            }
            $bytes = filesize($outPath);
            if ($bytes === false || $bytes <= 0) {
                throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
            }
            $sha = hash_file('sha256', $outPath);
            if ($sha === false) {
                throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
            }

            return [
                'ext' => $ext,
                'mime' => $canonicalMime,
                'width' => (int) $outInfo[0],
                'height' => (int) $outInfo[1],
                'bytes' => $bytes,
                'sha256' => $sha,
                'tmp_path' => $outPath,
            ];
        } catch (ImageProcessingException $e) {
            if ($image instanceof \GdImage) {
                imagedestroy($image);
            }
            if (is_string($outPath) && is_file($outPath)) {
                @unlink($outPath);
            }
            throw $e;
        } catch (\Throwable $e) {
            if ($image instanceof \GdImage) {
                imagedestroy($image);
            }
            if (is_string($outPath) && is_file($outPath)) {
                @unlink($outPath);
            }
            throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
        } finally {
            if ($previousLimit !== '') {
                @ini_set('memory_limit', $previousLimit);
            }
        }
    }

    private static function frameBytes(int $w, int $h): int
    {
        return $w * $h * 4;
    }

    private static function normalizeMime(string $mime): string
    {
        return match ($mime) {
            'image/jpg', 'image/pjpeg' => 'image/jpeg',
            default => $mime,
        };
    }

    private static function assertStatic(string $path, string $mime): void
    {
        $animated = match ($mime) {
            'image/gif' => self::gifIsAnimated($path),
            'image/png' => self::pngIsAnimated($path),
            'image/webp' => self::webpIsAnimated($path),
            default => false,
        };
        // true = animated; null = uncertain/malformed — both reject before GD.
        if ($animated !== false) {
            throw new ImageProcessingException(
                400,
                'VALIDATION',
                'Animated images are not supported. Upload a still image.'
            );
        }
    }

    /**
     * Strict GIF walk. Requires a trailer (0x3B) and terminated image sub-blocks.
     *
     * @return bool|null true animated, false static, null incomplete/malformed
     */
    public static function gifIsAnimated(string $path): ?bool
    {
        $data = @file_get_contents($path);
        if ($data === false || strlen($data) < 14) {
            return null;
        }
        if (!str_starts_with($data, 'GIF87a') && !str_starts_with($data, 'GIF89a')) {
            return null;
        }
        $len = strlen($data);
        $packed = ord($data[10]);
        $pos = 13;
        if ($packed & 0x80) {
            $gctSize = 3 * (1 << (($packed & 0x07) + 1));
            $pos = 13 + $gctSize;
            if ($pos > $len) {
                return null;
            }
        }

        $frames = 0;
        $sawTrailer = false;
        while ($pos < $len) {
            $b = ord($data[$pos]);
            if ($b === 0x3B) { // trailer
                $sawTrailer = true;
                $pos++;
                break;
            }
            if ($b === 0x21) { // extension
                if ($pos + 2 > $len) {
                    return null;
                }
                $pos += 2; // introducer + label
                if (!self::gifSkipDataSubBlocks($data, $len, $pos)) {
                    return null;
                }
                continue;
            }
            if ($b === 0x2C) { // image descriptor
                $frames++;
                if ($frames > 1) {
                    return true;
                }
                if ($pos + 10 > $len) {
                    return null;
                }
                $localPacked = ord($data[$pos + 9]);
                $pos += 10;
                if ($localPacked & 0x80) {
                    $lct = 3 * (1 << (($localPacked & 0x07) + 1));
                    $pos += $lct;
                    if ($pos > $len) {
                        return null;
                    }
                }
                if ($pos >= $len) {
                    return null;
                }
                $pos++; // LZW minimum code size
                if (!self::gifSkipDataSubBlocks($data, $len, $pos)) {
                    return null;
                }
                continue;
            }
            return null;
        }

        if (!$sawTrailer || $frames !== 1) {
            return null;
        }
        return false;
    }

    /** @param-out int $pos */
    private static function gifSkipDataSubBlocks(string $data, int $len, int &$pos): bool
    {
        while ($pos < $len) {
            $block = ord($data[$pos]);
            $pos++;
            if ($block === 0) {
                return true; // terminated
            }
            $pos += $block;
            if ($pos > $len) {
                return false;
            }
        }
        return false; // EOF without 0-length terminator
    }

    /**
     * @return bool|null true APNG, false static PNG, null malformed/truncated
     */
    public static function pngIsAnimated(string $path): ?bool
    {
        $fh = fopen($path, 'rb');
        if ($fh === false) {
            return null;
        }
        $sig = fread($fh, 8);
        if ($sig !== "\x89PNG\r\n\x1a\n") {
            fclose($fh);
            return null;
        }
        $sawIdat = false;
        while (!feof($fh)) {
            $lenData = fread($fh, 4);
            if ($lenData === false || strlen($lenData) === 0) {
                break;
            }
            if (strlen($lenData) < 4) {
                fclose($fh);
                return null;
            }
            $chunkLen = unpack('N', $lenData)[1];
            if ($chunkLen > 100_000_000) {
                fclose($fh);
                return null;
            }
            $type = fread($fh, 4);
            if ($type === false || strlen($type) < 4) {
                fclose($fh);
                return null;
            }
            if ($type === 'acTL') {
                fclose($fh);
                return true;
            }
            if ($type === 'IDAT') {
                $sawIdat = true;
            }
            if ($type === 'IEND') {
                // Consume data+CRC
                if ($chunkLen > 0 && fseek($fh, $chunkLen + 4, SEEK_CUR) !== 0) {
                    fclose($fh);
                    return null;
                }
                if ($chunkLen === 0 && fseek($fh, 4, SEEK_CUR) !== 0) {
                    fclose($fh);
                    return null;
                }
                fclose($fh);
                return $sawIdat ? false : null;
            }
            if (fseek($fh, $chunkLen + 4, SEEK_CUR) !== 0) {
                fclose($fh);
                return null;
            }
        }
        fclose($fh);
        return null;
    }

    /**
     * Strict WebP: RIFF size must match file length; all chunks complete.
     *
     * @return bool|null true animated, false static, null truncated/malformed
     */
    public static function webpIsAnimated(string $path): ?bool
    {
        $data = @file_get_contents($path);
        if ($data === false || strlen($data) < 16) {
            return null;
        }
        if (!str_starts_with($data, 'RIFF') || substr($data, 8, 4) !== 'WEBP') {
            return null;
        }
        $fileSize = strlen($data);
        $riffSize = unpack('V', substr($data, 4, 4))[1];
        // ChunkSize covers bytes after the size field through end of RIFF body.
        if ($riffSize + 8 !== $fileSize) {
            return null;
        }

        $end = $riffSize + 8;
        $pos = 12;
        $sawAnim = false;
        $sawAnmf = false;
        $sawImage = false;

        while ($pos < $end) {
            if ($pos + 8 > $end) {
                return null;
            }
            $fourcc = substr($data, $pos, 4);
            $size = unpack('V', substr($data, $pos + 4, 4))[1];
            $pos += 8;
            $payloadEnd = $pos + $size;
            if ($payloadEnd > $end) {
                return null;
            }
            if ($fourcc === 'ANIM') {
                $sawAnim = true;
            } elseif ($fourcc === 'ANMF') {
                $sawAnmf = true;
            } elseif ($fourcc === 'VP8 ' || $fourcc === 'VP8L' || $fourcc === 'VP8X') {
                $sawImage = true;
                if ($fourcc === 'VP8X') {
                    if ($size < 1) {
                        return null;
                    }
                    $flags = ord($data[$pos]);
                    if ($flags & 0x02) {
                        $sawAnim = true;
                    }
                }
            }
            $pos = $payloadEnd + ($size % 2); // pad to even
            if ($pos > $end) {
                return null;
            }
        }
        if ($pos !== $end) {
            return null;
        }
        if ($sawAnim || $sawAnmf) {
            return true;
        }
        if ($sawImage) {
            return false;
        }
        return null;
    }

    /** @return \GdImage */
    private static function decode(string $path, string $mime)
    {
        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            'image/gif' => @imagecreatefromgif($path),
            default => false,
        };
        if ($image === false) {
            throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
        }
        return $image;
    }

    /** @param \GdImage $image */
    private static function encode($image, string $path, string $mime): void
    {
        $ok = match ($mime) {
            'image/jpeg' => imagejpeg($image, $path, self::JPEG_QUALITY),
            'image/png' => imagepng($image, $path, self::PNG_COMPRESSION),
            'image/webp' => imagewebp($image, $path, self::WEBP_QUALITY),
            'image/gif' => imagegif($image, $path),
            default => false,
        };
        if ($ok !== true) {
            throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
        }
    }

    /** @param \GdImage $image @return \GdImage */
    private static function applyExifOrientation(string $path, $image)
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }
        $exif = @exif_read_data($path);
        if (!is_array($exif) || !isset($exif['Orientation'])) {
            return $image;
        }
        $orientation = (int) $exif['Orientation'];
        if ($orientation < 2 || $orientation > 8) {
            return $image;
        }

        $src = $image;
        $out = $src;
        if ($orientation === 2) {
            imageflip($out, IMG_FLIP_HORIZONTAL);
        } elseif ($orientation === 3) {
            $rotated = imagerotate($src, 180, 0);
            if ($rotated !== false) {
                imagedestroy($src);
                $out = $rotated;
            }
        } elseif ($orientation === 4) {
            imageflip($out, IMG_FLIP_VERTICAL);
        } elseif ($orientation === 5) {
            $rotated = imagerotate($src, -90, 0);
            if ($rotated !== false) {
                imagedestroy($src);
                imageflip($rotated, IMG_FLIP_HORIZONTAL);
                $out = $rotated;
            }
        } elseif ($orientation === 6) {
            $rotated = imagerotate($src, -90, 0);
            if ($rotated !== false) {
                imagedestroy($src);
                $out = $rotated;
            }
        } elseif ($orientation === 7) {
            $rotated = imagerotate($src, 90, 0);
            if ($rotated !== false) {
                imagedestroy($src);
                imageflip($rotated, IMG_FLIP_HORIZONTAL);
                $out = $rotated;
            }
        } elseif ($orientation === 8) {
            $rotated = imagerotate($src, 90, 0);
            if ($rotated !== false) {
                imagedestroy($src);
                $out = $rotated;
            }
        }
        return $out;
    }

    /** @param \GdImage $image */
    private static function preserveAlpha($image, string $mime): void
    {
        if ($mime === 'image/png' || $mime === 'image/webp' || $mime === 'image/gif') {
            imagealphablending($image, false);
            imagesavealpha($image, true);
            $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
            if ($transparent !== false) {
                imagefilledrectangle($image, 0, 0, imagesx($image), imagesy($image), $transparent);
            }
        }
    }
}
