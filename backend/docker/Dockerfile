FROM php:8.3-cli

RUN docker-php-ext-install pdo pdo_mysql \
  && printf 'upload_max_filesize=8M\npost_max_size=10M\n' > /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/backend

EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/router.php"]
