<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Db;

final class SitemapController
{
    /** @param array<string, string> $_params */
    public static function show(array $_params = []): void
    {
        $origin = self::publicOrigin();
        $inst = Db::institutionId();
        $pdo = Db::pdo();

        /** @var list<array{loc:string,lastmod:?string}> $urls */
        $urls = [];

        $static = ['/', '/about', '/organization', '/contact', '/privacy', '/news', '/services', '/events', '/resources'];
        foreach ($static as $path) {
            $urls[] = ['loc' => $origin . $path, 'lastmod' => null];
        }

        $queries = [
            ['SELECT slug, updated_at FROM pages WHERE institution_id = :inst AND status = \'published\'', '/'],
            ['SELECT slug, updated_at FROM news WHERE institution_id = :inst AND status = \'published\'', '/news/'],
            ['SELECT slug, updated_at FROM services WHERE institution_id = :inst AND status = \'published\'', '/services/'],
            ['SELECT slug, updated_at FROM events WHERE institution_id = :inst AND status = \'published\'', '/events/'],
            ['SELECT slug, updated_at FROM documents WHERE institution_id = :inst AND status = \'published\'', '/resources/'],
        ];

        foreach ($queries as [$sql, $prefix]) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['inst' => $inst]);
            foreach ($stmt->fetchAll() as $row) {
                $slug = (string) $row['slug'];
                // About is already listed as /about; skip duplicate /about page slug under /.
                if ($prefix === '/' && $slug === 'about') {
                    continue;
                }
                $loc = $prefix === '/'
                    ? $origin . '/' . rawurlencode($slug)
                    : $origin . $prefix . rawurlencode($slug);
                $urls[] = [
                    'loc' => $loc,
                    'lastmod' => self::lastmod($row['updated_at'] ?? null),
                ];
            }
        }

        header('Content-Type: application/xml; charset=utf-8');
        header('Cache-Control: public, max-age=3600');
        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $u) {
            echo '  <url>' . "\n";
            echo '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>' . "\n";
            if ($u['lastmod'] !== null) {
                echo '    <lastmod>' . $u['lastmod'] . '</lastmod>' . "\n";
            }
            echo '  </url>' . "\n";
        }
        echo '</urlset>' . "\n";
        exit;
    }

    private static function publicOrigin(): string
    {
        $config = Db::config();
        $fromConfig = isset($config['public_origin']) ? (string) $config['public_origin'] : '';
        $raw = $fromConfig !== ''
            ? $fromConfig
            : (getenv('EGWP_PUBLIC_ORIGIN') ?: 'http://127.0.0.1:8088');
        return rtrim($raw, '/');
    }

    private static function lastmod(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable((string) $value, new \DateTimeZone('UTC'));
            return $dt->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
