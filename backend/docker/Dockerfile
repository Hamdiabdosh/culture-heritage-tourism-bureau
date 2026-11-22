FROM php:8.3-cli

# GD (JPEG/PNG/WebP/GIF) + exif — required for Phase 2.3 media re-encoding (fail closed without them).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libjpeg62-turbo-dev \
      libpng-dev \
      libwebp-dev \
      libfreetype6-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_mysql gd exif \
    && rm -rf /var/lib/apt/lists/* \
    && printf 'upload_max_filesize=8M\npost_max_size=10M\n' > /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/backend

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/router.php"]
