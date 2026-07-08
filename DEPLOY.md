# GridRunner — деплой и настройка продакшена

Что нужно сделать руками один раз, чтобы игра работала на 100% (данные не сбрасывались, платежи шли, деплой был автоматом).

## 1. MongoDB Atlas (критично — без этого данные живут в памяти)

1. Зарегистрируйся на https://cloud.mongodb.com (бесплатно).
2. Create → Cluster → **M0 Free** → регион Frankfurt (eu-central-1) — ближе к игрокам из РФ.
3. Database Access → Add New Database User → логин/пароль (сохрани пароль!). Role: `readWriteAnyDatabase`.
4. Network Access → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`) — Netlify Functions ходят с разных IP.
5. Cluster → Connect → Drivers → скопируй connection string, подставь пароль:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gridrunner?retryWrites=true&w=majority
   ```
6. Netlify → Site (gridrunner.duckdns.org) → Site configuration → Environment variables → добавь:
   ```
   MONGODB_URI = <строка из шага 5>
   ```
7. Redeploy сайта. Готово: `db.js` сам увидит `MONGODB_URI` и переключится с in-memory на Mongo.
8. (Опционально) Первичный сев зон: `cd backend && MONGODB_URI=... node src/seed.js`.

## 2. Переменные окружения (Netlify → Environment variables)

| Переменная | Что это | Обязательно |
|---|---|---|
| `MONGODB_URI` | строка подключения Atlas | да |
| `JWT_SECRET` | случайная строка 32+ символов (сейчас fallback захардкожен — замени!) | да |
| `ADMIN_PASSWORD` | пароль от /cyber-admin | да |
| `PLATEGA_MERCHANT_ID` | ID мерчанта из ЛК Platega | для платежей |
| `PLATEGA_SECRET` | секрет из ЛК Platega | для платежей |

Сгенерировать JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 3. Platega.io (платежи)

1. Регистрация: https://platega.io → создать магазин → получить `MerchantId` и `Secret`.
2. В ЛК Platega указать callback URL:
   ```
   https://gridrunner.duckdns.org/.netlify/functions/api/api/v1/payment/platega-webhook
   ```
   (проверь фактический путь — функция монтируется как `/api/v1/payment/platega-webhook` относительно API-роута).
3. Задать env-переменные из таблицы выше → redeploy.
4. Проверка: страница /vip → выбрать план → должен открыться платёжный виджет Platega.
5. Вебхук проверяет заголовки `X-MerchantId`/`X-Secret` — левые запросы отбрасываются (403).

Код уже готов: `backend/src/payment/payment.routes.js` — создание инвойса, вебхук, ручная проверка статуса через `/confirm`.

## 4. GitHub авто-деплой

1. Залей монорепу на GitHub (`git init` → `git remote add origin ...` → push), если ещё не.
2. Netlify → оба сайта → Site configuration → Build & deploy → Link repository:
   - **Лендинг+API** (gridrunner.duckdns.org): Base directory `web/web-landing`, build `npm run build`, publish `web/web-landing/out`, functions — как в текущем netlify.toml.
   - **Игра** (game-gridrunner.netlify.app): Base directory `web/web-game`, build `npm run build`, publish `web/web-game/out`.
3. Теперь каждый push в main автоматически деплоит оба сайта.

## 5. Что уже сделано в коде (июль 2026)

- **Ачивки** — `achievementEngine.check()` теперь async, все вызовы БД awaited (раньше движок молча не работал).
- **Чекин** — исправлен баг с перепутанными аргументами haversine (дистанция до чекпоинта считалась неверно).
- **ELO + матчмейкинг** — рейтинг меняется при захвате чужой зоны и смерти от мины; `GET /api/v1/arena/matchmaking` подбирает соперников ±200 ELO поблизости; рейтинг и ранг (E…S) в профиле и лидерборде (`?sort=rating`).
- **Уведомления** — вместо WebSocket (не живут в serverless): события пишутся в коллекцию `events`, клиент поллит `GET /api/v1/events` каждые 15 сек и показывает тосты (атака на территорию, захват, мина, трейд, вступление в банду).
- **Арена** — зоны на карте обновляются каждые 20 сек даже стоя на месте.
- **Кэш OSM** — Overpass не дёргается повторно для одного района 7 дней (тайлы ~2 км в коллекции `osm_tiles`).
- **Платежи** — вебхук Platega защищён проверкой заголовков; ручной `/confirm` без реальной транзакции больше не выдаёт VIP, когда платёжка настроена.
- **Лендинг** — полностью переделан в стиле игры (неон, киберсетка, мокап телефона, банды, FAQ, SEO-теги).
