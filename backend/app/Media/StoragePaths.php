<?php
declare(strict_types=1);

namespace App\Media;

use App\Db;

/**
 * Resolve configured media directories and enforce D13 (outside document root).
 * Symlinks are resolved via realpath before comparison.
 */
final class StoragePaths
{
    public static function backendRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    /** PHP document root (backend/public). */
    public static function documentRoot(): string
    {
        $root = self::backendRoot() . '/public';
        $real = realpath($root);
        return $real !== false ? $real : $root;
    }

    public static function uploads(): string
    {
        return self::configuredOrDefault('uploads_dir', 'storage/uploads');
    }

    public static function quarantine(): string
    {
        return self::configuredOrDefault('quarantine_dir', 'storage/quarantine');
    }

    public static function backfillOriginals(): string
    {
        return self::configuredOrDefault('backfill_originals_dir', 'storage/backfill-originals');
    }

    /**
     * @return list<array{label:string,path:string}>
     */
    public static function all(): array
    {
        return [
            ['label' => 'uploads', 'path' => self::uploads()],
            ['label' => 'quarantine', 'path' => self::quarantine()],
            ['label' => 'backfill-originals', 'path' => self::backfillOriginals()],
        ];
    }

    /**
     * Ensure directory exists, is writable, and (after realpath) is outside the doc root.
     *
     * @throws ImageProcessingException
     */
    public static function ensureWritableOutsideDocRoot(string $path, string $label = 'storage'): string
    {
        if (!is_dir($path) && !@mkdir($path, 0750, true) && !is_dir($path)) {
            throw new ImageProcessingException(500, 'SERVER', 'Could not create ' . $label . ' folder.');
        }
        if (!is_writable($path)) {
            throw new ImageProcessingException(500, 'SERVER', $label . ' folder is not writable.');
        }

        $real = realpath($path);
        if ($real === false) {
            throw new ImageProcessingException(500, 'SERVER', $label . ' path could not be resolved.');
        }

        self::assertOutsideDocumentRoot($real, $label);
        return $real;
    }

    /**
     * @throws ImageProcessingException
     */
    public static function assertOutsideDocumentRoot(string $absolutePath, string $label = 'storage'): void
    {
        $doc = self::documentRoot();
        $docReal = realpath($doc) ?: $doc;
        $pathReal = realpath($absolutePath) ?: $absolutePath;

        $docNorm = rtrim(str_replace('\\', '/', $docReal), '/');
        $pathNorm = rtrim(str_replace('\\', '/', $pathReal), '/');

        if ($pathNorm === $docNorm || str_starts_with($pathNorm, $docNorm . '/')) {
            throw new ImageProcessingException(
                500,
                'SERVER',
                ucfirst($label) . ' directory must be outside the public web root.'
            );
        }
    }

    private static function configuredOrDefault(string $configKey, string $relativeDefault): string
    {
        $configured = null;
        try {
            $config = Db::config();
            $configured = $config[$configKey] ?? null;
        } catch (\Throwable) {
            $configured = null;
        }
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }
        return self::backendRoot() . '/' . $relativeDefault;
    }
}
