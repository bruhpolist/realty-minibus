# Realty Minibus (Minsk)

Full-stack scraper РґР»СЏ Р°СЂРµРЅРґС‹ РєРІР°СЂС‚РёСЂ РІ РњРёРЅСЃРєРµ СЃ С„РѕРєСѓСЃРѕРј РЅР° РґРёР°РїР°Р·РѕРЅ **300-450 USD** (РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ `990-1485 BYN` РїСЂРё РєСѓСЂСЃРµ `3.3`).

## Stage 1

РџРѕРґРіРѕС‚РѕРІР»РµРЅ Р±Р°Р·РѕРІС‹Р№ РєР°СЂРєР°СЃ:

- Monorepo: `backend` + `frontend` + `prisma`
- РљРѕРЅС„РёРіРё С†РµРЅРѕРІРѕРіРѕ С„РёР»СЊС‚СЂР° (`USD_RATE`, `PRICE_MIN`, `PRICE_MAX`)
- Prisma schema РґР»СЏ С‚Р°Р±Р»РёС†С‹ `Listing`
- Docker Compose СЃ PostgreSQL
- Р‘Р°Р·РѕРІС‹Рµ package.json Рё scripts

## Stage 2

Р”РѕР±Р°РІР»РµРЅС‹ backend-РјРѕРґСѓР»Рё:

- РџР°СЂСЃРµСЂС‹ `realt.by` Рё `kufar.by` РЅР° Playwright
- РќРѕСЂРјР°Р»РёР·Р°С†РёСЏ С†РµРЅС‹ РІ BYN СЃ С„РёР»СЊС‚СЂРѕРј `990-1485 BYN`
- Extract РїСЂРµРёРјСѓС‰РµСЃС‚РІ РІ С‚РµРіРё: `Р±Р°Р»РєРѕРЅ`, `РёРЅС‚РµСЂРЅРµС‚`, `wifi`, `РјРµР±РµР»СЊ`, `СЂРµРјРѕРЅС‚`, `РѕС…СЂР°РЅР°`, `РїР°СЂРєРёРЅРі`
- РћС‡РµСЂРµРґСЊ РёР·РѕР±СЂР°Р¶РµРЅРёР№ РЅР° BullMQ + Redis
- РЎРєР°С‡РёРІР°РЅРёРµ С„РѕС‚Рѕ РІ `public/images`

## Stage 3

Р”РѕР±Р°РІР»РµРЅС‹ backend runtime-РєРѕРјРїРѕРЅРµРЅС‚С‹:

- `Express` API (`/health`, `/api/listings`)
- `Socket.io` СЃРѕР±С‹С‚РёРµ `listing:new`
- `node-cron` Р·Р°РїСѓСЃРє sync РєР°Р¶РґС‹Рµ 10 РјРёРЅСѓС‚
- diff РїРѕ `hash` + upsert Р»РѕРіРёРєР° РІ PostgreSQL (Prisma)
- Telegram bot (Telegraf): `/start` -> РїРѕРґРїРёСЃРєР°, Р°РІС‚Рѕ-РѕС‚РїСЂР°РІРєР° РЅРѕРІС‹С… РѕР±СЉСЏРІР»РµРЅРёР№

## Stage 4

Р“РѕС‚РѕРІ frontend (Next.js App Router + TS + Tailwind + React Query):

- РЎС‚СЂР°РЅРёС†Р° `/listings`
- `ListingCard` СЃ:
  - СЃР»Р°Р№РґРµСЂРѕРј РІСЃРµС… С„РѕС‚Рѕ (`embla-carousel-react`)
  - lightbox (`yet-another-react-lightbox`)
  - РєСЂСѓРїРЅРѕР№ С†РµРЅРѕР№ BYN/USD
  - Р°РґСЂРµСЃРѕРј, РїР°СЂР°РјРµС‚СЂР°РјРё, С‚РµРіР°РјРё РїСЂРµРёРјСѓС‰РµСЃС‚РІ
  - РєРЅРѕРїРєРѕР№ "РћС‚РєСЂС‹С‚СЊ РЅР° СЃР°Р№С‚Рµ"
- Р¤РёР»СЊС‚СЂС‹: СЂР°Р№РѕРЅ, РєРѕРјРЅР°С‚С‹, С‚РµРіРё
- РљР°СЂС‚Р° СЃ РїРёРЅР°РјРё (`react-leaflet`)
- Real-time toast "РќРѕРІР°СЏ РєРІР°СЂС‚РёСЂР°!" (`socket.io-client` + `sonner`)
- Mobile-first responsive grid

## Stage 5

Р”РѕР±Р°РІР»РµРЅС‹ С‚РµСЃС‚С‹ Рё deploy-Р°СЂС‚РµС„Р°РєС‚С‹:

- Unit tests backend (Vitest): РїСЂРѕРІРµСЂРєР° price filter, BYN/USD conversion, feature extraction
- Smoke test API (`scripts/smoke.mjs`): `/health` Рё `/api/listings`
- `Dockerfile.backend` (API + cron + telegram)
- `Dockerfile.frontend` (Next.js)
- `docker-compose.prod.yml` (`postgres`, `redis`, `backend`, `worker`, `frontend`)
- РћР±С‰РёР№ volume РґР»СЏ РёР·РѕР±СЂР°Р¶РµРЅРёР№: `/app/public/images`

## Stage 6

Р—Р°РєСЂС‹С‚С‹ РѕСЃС‚Р°РІС€РёРµСЃСЏ С€Р°РіРё:

- Р”РѕР±Р°РІР»РµРЅ parser `realty.by`
- Р”РѕР±Р°РІР»РµРЅ parser РїСѓР±Р»РёС‡РЅС‹С… TG-РєР°РЅР°Р»РѕРІ (`TG_CHANNELS=channel1,channel2`)
- РЈР»СѓС‡С€РµРЅР° РєР°СЂС‚Р°: С‚РѕС‡РЅР°СЏ РіРµРѕРєРѕРґРёСЂРѕРІРєР° Р°РґСЂРµСЃРѕРІ (OSM Nominatim) + РєСЌС€ РІ `localStorage`
- Р”РѕР±Р°РІР»РµРЅС‹ e2e С‚РµСЃС‚С‹ UI (Playwright) РґР»СЏ `/listings` Рё С„РёР»СЊС‚СЂРѕРІ

## Stage 7

РџРµСЂРµРєР»СЋС‡РµРЅРѕ РЅР° API polling (Р±РµР· browser scraping):

- `kufar.by` С‡РµСЂРµР· `search-api/v2/search/rendered-paginated`
- `realt.by` С‡РµСЂРµР· `bff/graphql`
- `onliner.by` С‡РµСЂРµР· `sdapi/ak.api/search/apartments`
- РћРїСЂРѕСЃ РєР°Р¶РґС‹Рµ `POLL_INTERVAL_MS` (РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ `10000` РјСЃ)
- Diff/DB update/Telegram notify СЃРѕС…СЂР°РЅРµРЅС‹

## РЎС‚СЂСѓРєС‚СѓСЂР°

```text
realty-minibus/
в”њв”Ђв”Ђ backend/
в”‚   в”њв”Ђв”Ђ src/
в”‚   в”‚   в””в”Ђв”Ђ config.ts
в”‚   в”њв”Ђв”Ђ package.json
в”‚   в””в”Ђв”Ђ tsconfig.json
в”њв”Ђв”Ђ frontend/
в”‚   в””в”Ђв”Ђ package.json
в”њв”Ђв”Ђ prisma/
в”‚   в””в”Ђв”Ђ schema.prisma
в”њв”Ђв”Ђ .env.example
в”њв”Ђв”Ђ docker-compose.yml
в””в”Ђв”Ђ package.json
```

## Р‘С‹СЃС‚СЂС‹Р№ СЃС‚Р°СЂС‚

1. РЈСЃС‚Р°РЅРѕРІРёС‚СЊ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё:

```bash
npm install
```

2. РЎРєРѕРїРёСЂРѕРІР°С‚СЊ env:

```bash
cp .env.example .env
```

3. РџРѕРґРЅСЏС‚СЊ PostgreSQL:

```bash
docker compose up -d
```

4. РџСЂРёРјРµРЅРёС‚СЊ Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

5. Р—Р°РїСѓСЃС‚РёС‚СЊ worker РёР·РѕР±СЂР°Р¶РµРЅРёР№ (РѕС‚РґРµР»СЊРЅС‹Р№ С‚РµСЂРјРёРЅР°Р»):

```bash
npm --workspace backend run worker:images
```
Р‘РµР· worker API РїСЂРѕРґРѕР»Р¶РёС‚ СЂР°Р±РѕС‚Р°С‚СЊ, РЅРѕ РЅРѕРІС‹Рµ РєР°СЂС‚РёРЅРєРё РЅРµ Р±СѓРґСѓС‚ СЃРєР°С‡РёРІР°С‚СЊСЃСЏ РІ Р»РѕРєР°Р»СЊРЅС‹Р№ `/public/images`.

6. Р—Р°РїСѓСЃС‚РёС‚СЊ СЃРєСЂР°РїРёРЅРі РµРґРёРЅРѕСЂР°Р·РѕРІРѕ:

```bash
npm --workspace backend run scrape:once
```

7. Р—Р°РїСѓСЃС‚РёС‚СЊ API + cron + bot:

```bash
npm --workspace backend run dev
```

9. Р—Р°РїСѓСЃС‚РёС‚СЊ frontend:

```bash
npm --workspace frontend run dev
```

10. Р—Р°РїСѓСЃС‚РёС‚СЊ С‚РµСЃС‚С‹:

```bash
npm run test:backend
```

11. Smoke test (РєРѕРіРґР° backend РїРѕРґРЅСЏС‚):

```bash
npm run smoke
```

12. РџСЂРѕРґРѕРІС‹Р№ Docker-СЃС‚РµРє:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

13. E2E С‚РµСЃС‚С‹:

```bash
npx playwright install chromium
npm run test:e2e
```

8. Р­РЅРґРїРѕРёРЅС‚ СЃРїРёСЃРєР°:

```text
GET /api/listings?district=С†РµРЅС‚СЂ&rooms=1,2&tags=wifi,Р±Р°Р»РєРѕРЅ&limit=50
```

## Р’Р°Р¶РЅРѕ РїСЂРѕ С„РёР»СЊС‚СЂ

РЎРёСЃС‚РµРјР° РґРѕР»Р¶РЅР° СЃРѕС…СЂР°РЅСЏС‚СЊ Рё СѓРІРµРґРѕРјР»СЏС‚СЊ С‚РѕР»СЊРєРѕ РєРІР°СЂС‚РёСЂС‹ РІ РґРёР°РїР°Р·РѕРЅРµ:

- `PRICE_MIN=990`
- `PRICE_MAX=1485`
- `USD_RATE=3.3`

Р”РёР°РїР°Р·РѕРЅ СЌРєРІРёРІР°Р»РµРЅС‚РµРЅ **300-450 USD**.

