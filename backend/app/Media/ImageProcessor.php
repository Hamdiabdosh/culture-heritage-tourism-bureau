<?php
declare(strict_types=1);

namespace App\Media;

/**
 * Server-side image validation + mandatory GD re-encoding (Phase 2.3 WS1).
 *
 * Memory budget (documented for ops):
 * - Reject before decode when area > 24 MP or either edge > 8,000 px (D15).
 * - Worst-case accepted frame ≈ 24e6 pixels × 4 bytes RGBA ≈ 96 MB per GD buffer.
 * - Decode + optional resize holds ~2 buffers ≈ 192 MB, plus PHP/finfo overhead.
 * - Upload route raises memory_limit to 256 MB (single request). Concurrent
 *   workers need ~200 MB headroom each; do not rely on OOM as validation.
 * - Ceiling: multi-worker hosts under memory pressure — upgrade path is lower
 *   pixel caps in config or a queue worker with a higher dedicated limit.
 *
 * ponytail: animation detectors are byte-level scanners (GIF descriptors,
 * WebP ANIM/ANMF, PNG acTL). False uncertainty → reject (fail closed).
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
        $need = ['jpeg', 'png', 'webp', 'gif'];
        foreach ($need as $f) {
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
        $megapixels = ($width * $height) / 1_000_000;
        if ($megapixels > self::MAX_MEGAPIXELS) {
            throw new ImageProcessingException(400, 'VALIDATION', 'Image is too large (max 24 megapixels).');
        }

        self::assertStatic($tmpPath, $canonicalMime);

        $previousLimit = ini_get('memory_limit');
        @ini_set('memory_limit', self::UPLOAD_MEMORY_LIMIT);

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
                $srcW = $dstW;
                $srcH = $dstH;
            }

            $outPath = tempnam(sys_get_temp_dir(), 'egwpimg');
            if ($outPath === false) {
                throw new ImageProcessingException(500, 'SERVER', 'Could not save the image.');
            }
            // tempnam creates an empty file; encode overwrites it.
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
            if (is_resource($image) || $image instanceof \GdImage) {
                imagedestroy($image);
            }
            if (is_string($outPath) && is_file($outPath)) {
                @unlink($outPath);
            }
            throw $e;
        } catch (\Throwable $e) {
            if (is_resource($image) || $image instanceof \GdImage) {
                imagedestroy($image);
            }
            if (is_string($outPath) && is_file($outPath)) {
                @unlink($outPath);
            }
            throw new ImageProcessingException(400, 'VALIDATION', 'This image could not be processed.');
        } finally {
            if (is_string($previousLimit) && $previousLimit !== '') {
                @ini_set('memory_limit', $previousLimit);
            }
        }
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
        if ($animated === true) {
            throw new ImageProcessingException(
                400,
                'VALIDATION',
                'Animated images are not supported. Upload a still image.'
            );
        }
        if ($animated === null) {
            // Uncertain → reject rather than accept.
            throw new ImageProcessingException(
                400,
                'VALIDATION',
                'Animated images are not supported. Upload a still image.'
            );
        }
    }

    /**
     * @return bool|null true animated, false static, null uncertain
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
        $pos = 13; // after header + logical screen descriptor start
        // Skip global color table if present.
        $packed = ord($data[10]);
        if ($packed & 0x80) {
            $gctSize = 3 * (1 << (($packed & 0x07) + 1));
            $pos = 13 + $gctSize;
        }
        $frames = 0;
        while ($pos < $len) {
            $b = ord($data[$pos]);
            if ($b === 0x3B) { // trailer
                break;
            }
            if ($b === 0x21) { // extension
                if ($pos + 2 >= $len) {
                    return null;
                }
                $pos += 2;
                while ($pos < $len) {
                    $block = ord($data[$pos]);
                    $pos++;
                    if ($block === 0) {
                        break;
                    }
                    $pos += $block;
                    if ($pos > $len) {
                        return null;
                    }
                }
                continue;
            }
            if ($b === 0x2C) { // image descriptor
                $frames++;
                if ($frames > 1) {
                    return true;
                }
                if ($pos + 10 >= $len) {
                    return null;
                }
                $localPacked = ord($data[$pos + 9]);
                $pos += 10;
                if ($localPacked & 0x80) {
                    $lct = 3 * (1 << (($localPacked & 0x07) + 1));
                    $pos += $lct;
                }
                if ($pos >= $len) {
                    return null;
                }
                $pos++; // LZW min code size
                while ($pos < $len) {
                    $block = ord($data[$pos]);
                    $pos++;
                    if ($block === 0) {
                        break;
                    }
                    $pos += $block;
                    if ($pos > $len) {
                        return null;
                    }
                }
                continue;
            }
            return null;
        }
        return $frames === 1 ? false : ($frames === 0 ? null : true);
    }

    /** @return bool|null */
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
        while (!feof($fh)) {
            $lenData = fread($fh, 4);
            if ($lenData === false || strlen($lenData) < 4) {
                break;
            }
            $len = unpack('N', $lenData)[1];
            $type = fread($fh, 4);
            if ($type === false || strlen($type) < 4) {
                fclose($fh);
                return null;
            }
            if ($type === 'acTL') {
                fclose($fh);
                return true;
            }
            if ($type === 'IDAT' || $type === 'IEND') {
                fclose($fh);
                return false;
            }
            if ($len > 0) {
                if (fseek($fh, $len + 4, SEEK_CUR) !== 0) {
                    fclose($fh);
                    return null;
                }
            } else {
                if (fseek($fh, 4, SEEK_CUR) !== 0) { // CRC
                    fclose($fh);
                    return null;
                }
            }
        }
        fclose($fh);
        return null;
    }

    /** @return bool|null */
    public static function webpIsAnimated(string $path): ?bool
    {
        $data = @file_get_contents($path);
        if ($data === false || strlen($data) < 16) {
            return null;
        }
        if (!str_starts_with($data, 'RIFF') || substr($data, 8, 4) !== 'WEBP') {
            return null;
        }
        // Chunk walk after RIFF header (12) + WEBP fourcc already counted in 12? RIFF size at 4..7, form type at 8..11, then chunks at 12.
        $len = strlen($data);
        $pos = 12;
        $sawAnim = false;
        $sawAnmf = false;
        $sawVp8 = false;
        while ($pos + 8 <= $len) {
            $fourcc = substr($data, $pos, 4);
            $size = unpack('V', substr($data, $pos + 4, 4))[1];
            $pos += 8;
            if ($fourcc === 'ANIM') {
                $sawAnim = true;
            } elseif ($fourcc === 'ANMF') {
                $sawAnmf = true;
            } elseif ($fourcc === 'VP8 ' || $fourcc === 'VP8L' || $fourcc === 'VP8X') {
                $sawVp8 = true;
                if ($fourcc === 'VP8X' && $size >= 1 && $pos < $len) {
                    // Feature flags: bit 1 (0x02) = animation
                    $flags = ord($data[$pos]);
                    if ($flags & 0x02) {
                        $sawAnim = true;
                    }
                }
            }
            $pos += $size + ($size % 2); // pad to even
            if ($pos > $len) {
                return null;
            }
        }
        if ($sawAnim || $sawAnmf) {
            return true;
        }
        if ($sawVp8) {
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
        // Unreadable / unknown orientation: leave pixels as-is (not fatal).
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
