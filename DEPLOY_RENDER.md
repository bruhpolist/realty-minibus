# Deploy In One Place (Render + Git)

Этот проект можно развернуть в одном месте через Git-репозиторий с помощью `render.yaml`.

## Что будет поднято

- `realty-postgres` (PostgreSQL)
- `realty-redis` (Redis)
- `realty-backend` (API + polling + Telegram bot)
- `realty-image-worker` (BullMQ worker для фото)
- `realty-frontend` (Next.js)

## Шаги

1. Запушьте репозиторий на GitHub/GitLab.
2. В Render: `New` -> `Blueprint`.
3. Подключите репозиторий и выберите ветку.
4. Render обнаружит `render.yaml` и создаст все сервисы.
5. В `realty-backend` задайте секрет:
   - `BOT_TOKEN` (обязательно для Telegram-уведомлений)

## Важные переменные

- `NEXT_PUBLIC_API_URL` (во frontend): уже указывает на `https://realty-backend.onrender.com`
- `FRONTEND_ORIGIN` (в backend): уже указывает на `https://realty-frontend.onrender.com`
- `PRICE_MIN=990`, `PRICE_MAX=1485`
- `MAX_LISTINGS=2000`
- `POLL_INTERVAL_MS=10000`

## После первого деплоя

1. Откройте `https://realty-frontend.onrender.com/listings`
2. Проверьте backend health:
   - `https://realty-backend.onrender.com/health`
3. В Telegram отправьте `/start` вашему боту.

## Замечания

- На Render файловая система эфемерная, поэтому локальные `/images` не гарантированы между деплоями.
- В проекте уже есть fallback: если локального файла нет, используются remote URL фотографий.
- Для устойчивого хранения фото лучше использовать S3/Cloudflare R2 (можно добавить следующим шагом).
