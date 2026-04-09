# Деплой на Railway (один Git-репозиторий)

Этот проект деплоится на Railway из одного репозитория, но как несколько сервисов:
- `postgres` (managed database)
- `redis` (managed redis)
- `realty-backend` (API + polling + Telegram bot)
- `realty-image-worker` (BullMQ worker для фото)
- `realty-frontend` (Next.js)

## 1. Подготовка репозитория

1. Убедитесь, что актуальные изменения запушены в `master`.
2. В репозитории должны быть:
- `Dockerfile.backend`
- `Dockerfile.worker`
- `Dockerfile.frontend`

## 2. Создать проект на Railway

1. Откройте Railway -> `New Project`.
2. Выберите `Deploy from GitHub repo`.
3. Выберите `bruhpolist/realty-minibus`.

## 3. Добавить Postgres и Redis

1. Внутри проекта Railway нажмите `New` -> `Database` -> `PostgreSQL`.
2. Затем `New` -> `Database` -> `Redis`.
3. Railway создаст сервисы и внутренние переменные подключения.

## 4. Создать backend service

1. `New` -> `Service` -> `GitHub Repo` -> тот же репозиторий.
2. Название: `realty-backend`.
3. В `Settings`:
- `Builder`: Dockerfile
- `Dockerfile Path`: `Dockerfile.backend`
- `Root Directory`: `/` (корень)
- `Start Command`: оставить пустым (используется `CMD` из Dockerfile)
4. В `Variables` добавьте:
- `DATABASE_URL` = из Postgres (`Connection URL`)
- `REDIS_URL` = из Redis (`Redis URL`)
- `PORT` = `4000`
- `USD_RATE` = `3.3`
- `PRICE_MIN` = `990`
- `PRICE_MAX` = `1485`
- `MAX_LISTINGS` = `2000`
- `SCRAPE_LIMIT_PER_SOURCE` = `35`
- `POLL_INTERVAL_MS` = `10000`
- `IMAGES_DIR` = `../public/images`
- `BOT_TOKEN` = токен вашего Telegram бота
- `TG_CHANNELS` = пусто или список каналов через запятую
- `TELEGRAM_WEBHOOK_URL` = пусто
- `FRONTEND_ORIGIN` = домен фронтенда Railway (поставите после п.6)
- `FRONTEND_ORIGINS` = `http://localhost:3000` и домен фронтенда через запятую

## 5. Создать worker service

1. `New` -> `Service` -> тот же репозиторий.
2. Название: `realty-image-worker`.
3. В `Settings`:
- `Builder`: Dockerfile
- `Dockerfile Path`: `Dockerfile.worker`
- `Root Directory`: `/`
4. В `Variables` добавьте:
- `DATABASE_URL` = как у backend
- `REDIS_URL` = как у backend
- `USD_RATE` = `3.3`
- `PRICE_MIN` = `990`
- `PRICE_MAX` = `1485`
- `MAX_LISTINGS` = `2000`
- `IMAGES_DIR` = `../public/images`

## 6. Создать frontend service

1. `New` -> `Service` -> тот же репозиторий.
2. Название: `realty-frontend`.
3. В `Settings`:
- `Builder`: Dockerfile
- `Dockerfile Path`: `Dockerfile.frontend`
- `Root Directory`: `/`
4. В `Variables` добавьте:
- `NEXT_PUBLIC_API_URL` = публичный домен backend (например `https://realty-backend-production.up.railway.app`)

## 7. Домен и CORS

1. Откройте frontend service и скопируйте его публичный URL.
2. Вернитесь в backend variables и обновите:
- `FRONTEND_ORIGIN`
- `FRONTEND_ORIGINS`
3. Redeploy backend после изменения переменных.

## 8. Проверка запуска

1. Откройте backend health:
- `https://<backend-domain>/ready`
2. Откройте фронт:
- `https://<frontend-domain>/listings`
3. В Telegram напишите боту `/start`.

## 9. Как обновлять

1. Локально: `git add . && git commit -m "..." && git push`.
2. Railway автоматически перезапустит сервисы, привязанные к репозиторию.

## Важно

- Файловая система в контейнере эфемерная, локальные картинки в `public/images` не гарантируются между деплоями.
- Для стабильного хранения фото лучше вынести в S3/R2 (можно добавить отдельным шагом).
