<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;
use App\Policies\ContentPolicy;

/**
 * CMS image upload + public serve under /api/media/{file}.
 * Files live in backend/storage/uploads (not in the SPA build).
 */
final class MediaController
{
    private const MAX_BYTES = 5_242_880; // 5 MB
    /** MIME → stored extension. image/jpg + image/pjpeg are non-standard but common. */
    private const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /** @param array<string, string> $_params */
    public static function cmsUpload(array $_params = []): void
    {
        ContentPolicy::requireEditor();

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
        if ($size <= 0 || $size > self::MAX_BYTES) {
            json_error(400, 'VALIDATION', 'Image must be under 5 MB.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = strtolower((string) ($finfo->file($tmp) ?: ''));
        // Some desktops report JPEG as image/jpg; fall back to magic bytes.
        if (!isset(self::ALLOWED[$mime])) {
            $mime = self::detectMimeFromBytes($tmp) ?? $mime;
        }
        if (!isset(self::ALLOWED[$mime])) {
            json_error(400, 'VALIDATION', 'Use a JPEG, PNG, WebP, or GIF image.');
        }

        $dir = self::uploadsDir();
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            json_error(500, 'SERVER', 'Could not create uploads folder.');
        }

        $ext = self::ALLOWED[$mime];
        $name = uuid_v4() . '.' . $ext;
        $dest = $dir . DIRECTORY_SEPARATOR . $name;
        if (!move_uploaded_file($tmp, $dest)) {
            json_error(500, 'SERVER', 'Could not save the image.');
        }

        json_response(201, [
            'url' => '/api/media/' . $name,
            'name' => $name,
            'mime' => $ext === 'jpg' ? 'image/jpeg' : $mime,
            'size' => $size,
        ]);
    }

    /** @return null|key-of<self::ALLOWED> */
    private static function detectMimeFromBytes(string $path): ?string
    {
        $fh = fopen($path, 'rb');
        if ($fh === false) {
            return null;
        }
        $head = fread($fh, 16) ?: '';
        fclose($fh);
        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($head, 'GIF87a') || str_starts_with($head, 'GIF89a')) {
            return 'image/gif';
        }
        if (strlen($head) >= 12 && str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP') {
            return 'image/webp';
        }
        return null;
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

        // Override front-controller JSON default.
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($path));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
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
