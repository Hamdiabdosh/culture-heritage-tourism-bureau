<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Media\ImageProcessingException;
use App\Media\ImageProcessor;
use App\Policies\ContentPolicy;

/**
 * CMS image upload + public serve under /api/media/{file}.
 * Files live in backend/storage/uploads (not in the SPA build).
 *
 * WS1: mandatory GD re-encoding on upload. Public serve remains filename-based
 * (no media registry gate yet — that lands with migrations + backfill).
 */
final class MediaController
{
    /** @param array<string, string> $_params */
    public static function cmsCapabilities(array $_params = []): void
    {
        ContentPolicy::requireViewer();
        $caps = ImageProcessor::capabilities();
        $forced = self::forceUnavailable();
        json_response(200, [
            'imageProcessing' => !$forced && $caps['ok'] === true,
            'formats' => $caps['ok'] === true ? $caps['formats'] : [],
            'limits' => [
                'maxBytes' => ImageProcessor::MAX_BYTES,
                'maxMegapixels' => ImageProcessor::MAX_MEGAPIXELS,
                'maxEdgePx' => ImageProcessor::MAX_EDGE_PX,
                'maxStoredEdgePx' => ImageProcessor::MAX_STORED_EDGE_PX,
                'memoryLimit' => ImageProcessor::UPLOAD_MEMORY_LIMIT,
            ],
            'missing' => $forced ? ['forced_unavailable'] : ($caps['ok'] === true ? [] : $caps['missing']),
        ]);
    }

    /** @param array<string, string> $_params */
    public static function cmsUpload(array $_params = []): void
    {
        ContentPolicy::requireEditor();

        if (self::forceUnavailable() || !ImageProcessor::isAvailable()) {
            json_error(503, 'UNAVAILABLE', 'Image processing is unavailable');
        }

        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            json_error(400, 'VALIDATION', 'Choose an image file to upload.');
        }

        $file = $_FILES['file'];
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            json_error(400, 'VALIDATION', self::uploadErrorMessage($error));
        }

        $tmp = (string) ($file['tmp_name'] ?? '');
        $size = (int) ($file['size'] ?? 0);
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            json_error(400, 'VALIDATION', 'Upload failed. Try again.');
        }
        if ($size <= 0 || $size > ImageProcessor::MAX_BYTES) {
            json_error(400, 'VALIDATION', 'Image must be under 5 MB.');
        }

        self::ensureStorageDirs();

        try {
            $processed = ImageProcessor::processUpload($tmp);
        } catch (ImageProcessingException $e) {
            json_error($e->status, $e->errorCode, $e->getMessage());
        }

        $name = uuid_v4() . '.' . $processed['ext'];
        $dest = self::uploadsDir() . DIRECTORY_SEPARATOR . $name;
        // Place re-encoded bytes only — never move the raw upload into storage.
        if (!@rename($processed['tmp_path'], $dest)) {
            if (!@copy($processed['tmp_path'], $dest)) {
                @unlink($processed['tmp_path']);
                json_error(500, 'SERVER', 'Could not save the image.');
            }
            @unlink($processed['tmp_path']);
        }
        @chmod($dest, 0640);

        json_response(201, [
            'url' => '/api/media/' . $name,
            'name' => $name,
            'mime' => $processed['mime'],
            'size' => $processed['bytes'],
            'width' => $processed['width'],
            'height' => $processed['height'],
        ]);
    }

    /** @param array<string, string> $params */
    public static function publicShow(array $params = []): void
    {
        $raw = $params['file'] ?? '';
        $file = basename($raw);
        if ($file === '' || $file !== $raw || !preg_match('/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/i', $file)) {
            json_error(404, 'NOT_FOUND', 'Image not found.');
        }

        $path = self::uploadsDir() . DIRECTORY_SEPARATOR . $file;
        if (!is_file($path)) {
            json_error(404, 'NOT_FOUND', 'Image not found.');
        }

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'application/octet-stream',
        };

        // WS1: keep filename-based public serving for existing URL compatibility.
        // Registry gate + D11 cache change arrive with later workstreams.
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($path));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: default-src 'none'; sandbox");
        header('Content-Disposition: inline; filename="' . $file . '"');
        readfile($path);
        exit;
    }

    private static function forceUnavailable(): bool
    {
        // Ops/test escape hatch — never enable in production config.
        if (getenv('EGWP_MEDIA_FORCE_UNAVAILABLE') === '1') {
            return true;
        }
        $config = Db::config();
        return !empty($config['media']['force_unavailable']);
    }

    private static function ensureStorageDirs(): void
    {
        foreach ([self::uploadsDir(), self::quarantineDir(), self::backfillOriginalsDir()] as $dir) {
            if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
                json_error(500, 'SERVER', 'Could not create uploads folder.');
            }
        }
        $docRoot = realpath(dirname(__DIR__, 2) . '/public');
        $uploadsReal = realpath(self::uploadsDir());
        if ($docRoot !== false && $uploadsReal !== false && str_starts_with($uploadsReal, $docRoot)) {
            json_error(500, 'SERVER', 'Uploads directory must be outside the public web root.');
        }
    }

    private static function uploadsDir(): string
    {
        $config = Db::config();
        $configured = $config['uploads_dir'] ?? null;
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }
        return dirname(__DIR__, 2) . '/storage/uploads';
    }

    private static function quarantineDir(): string
    {
        $config = Db::config();
        $configured = $config['quarantine_dir'] ?? null;
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }
        return dirname(__DIR__, 2) . '/storage/quarantine';
    }

    private static function backfillOriginalsDir(): string
    {
        $config = Db::config();
        $configured = $config['backfill_originals_dir'] ?? null;
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }
        return dirname(__DIR__, 2) . '/storage/backfill-originals';
    }

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Image is too large.',
            UPLOAD_ERR_PARTIAL => 'Upload was interrupted. Try again.',
            UPLOAD_ERR_NO_FILE => 'Choose an image file to upload.',
            default => 'Upload failed. Try again.',
        };
    }
}
