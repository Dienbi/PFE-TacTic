FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.2-cli-alpine
WORKDIR /var/www/html

# Install runtime deps and build deps to compile extensions, then remove build deps
RUN apk add --no-cache bash oniguruma-dev libzip-dev libpq \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev \
    && docker-php-ext-install pdo_pgsql bcmath \
    && apk del .build-deps \
    && addgroup -S app && adduser -S app -G app

COPY --from=vendor /app/vendor ./vendor
COPY backend/ .

RUN chown -R app:app /var/www/html/storage /var/www/html/bootstrap/cache

USER app
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
