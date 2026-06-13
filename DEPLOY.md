# DEPLOY.md — Деплой на VPS сервер

> **ВАЖНО:** Этот проект деплоится на собственный VPS, **НЕ на Netlify**.
> Netlify больше не используется для публикации сайта.

---

## Сервер

| Параметр | Значение |
|---|---|
| IP | `185.202.172.59` |
| Пользователь | `root` |
| SSH ключ | `~/.ssh/id_ed25519` (уже настроен) |
| Домен | `https://hsmuebles.es` (и `www.hsmuebles.es`) |
| Сайт (по IP) | `http://185.202.172.59` |
| Папка проекта | `/var/www/hs-muebles/` |

### Домен и HTTPS

| Параметр | Значение |
|---|---|
| Домен | `hsmuebles.es`, `www.hsmuebles.es` |
| DNS | **Cloudflare** (NS `tate`/`eleanor.ns.cloudflare.com`), A-записи `@` и `www` → `185.202.172.59`, **серое облако (DNS only)** |
| SSL | Let's Encrypt через **certbot --nginx**, авто-продление `certbot.timer` (systemd) |
| Редирект | `http → https` (301), оба домена с www и без |

> ⚠️ A-запись держать **серой (DNS only)**, не оранжевой — иначе Cloudflare режет тело запроса на 100 МБ и ломает загрузку видео (до 200 МБ).

```bash
# Перевыпустить/добавить домен к сертификату
ssh root@185.202.172.59 "certbot --nginx -d hsmuebles.es -d www.hsmuebles.es --redirect"
# Проверить продление
ssh root@185.202.172.59 "certbot renew --dry-run"
```

### Подключение к серверу
```bash
ssh root@185.202.172.59
```

---

## Структура на сервере

```
/var/www/hs-muebles/
├── dist/          ← собранный фронтенд (React SPA)
├── server/        ← Express API (Node.js)
│   ├── index.js
│   ├── auth.js
│   ├── db.js
│   ├── store.js
│   ├── settings.js
│   └── node_modules/
├── uploads/       ← загруженные картинки и видео
├── src/data/      ← JSON файлы для seed каталога
├── .env           ← секреты (DB, пароли)
└── ecosystem.config.cjs  ← PM2 конфиг
```

---

## Стек на сервере

| Сервис | Описание |
|---|---|
| **PM2** (`hs-api`) | держит Node.js/Express живым, автозапуск |
| **Nginx** (host, не Docker) | порты 80/443, конфиг `/etc/nginx/sites-available/hs-muebles`; отдаёт статику `dist/` и `uploads/`, проксирует `/api/` на Express :4000 |
| **certbot** | Let's Encrypt SSL для `hsmuebles.es`, авто-продление `certbot.timer` |
| **PostgreSQL 16** | БД `hs_muebles`, пользователь `hs_user` |
| **Express** | порт `4000`, отдаёт API; статику отдаёт nginx напрямую |

---

## Полный деплой (фронтенд + бэкенд)

Когда изменился и фронтенд (src/) и бэкенд (server/):

```bash
# 1. Собрать фронтенд (без Netlify плагина!)
npm run build -- --config vite.config.vps.js

# 2. Скопировать dist/ на сервер
scp -r dist root@185.202.172.59:/var/www/hs-muebles/

# 3. Скопировать изменённые файлы сервера
scp server/index.js server/store.js server/settings.js server/auth.js server/order.js server/notify.js root@185.202.172.59:/var/www/hs-muebles/server/

# 4. Перезапустить API
ssh root@185.202.172.59 "pm2 restart hs-api"
```

> Если менялся `server/package.json` (новые зависимости), перед перезапуском:
> `ssh root@185.202.172.59 "cd /var/www/hs-muebles/server && npm install"`

---

## Деплой только фронтенда

Когда изменился только src/ (React компоненты, страницы, стили):

```bash
npm run build -- --config vite.config.vps.js
scp -r dist root@185.202.172.59:/var/www/hs-muebles/
```
Перезапуск PM2 **не нужен** — статика отдаётся напрямую.

---

## Деплой только бэкенда

Когда изменились только server/*.js файлы:

```bash
scp server/index.js server/store.js server/settings.js root@185.202.172.59:/var/www/hs-muebles/server/
ssh root@185.202.172.59 "pm2 restart hs-api"
```

---

## Управление сервером

```bash
# Статус процессов
ssh root@185.202.172.59 "pm2 status"

# Логи (последние 50 строк)
ssh root@185.202.172.59 "pm2 logs hs-api --nostream --lines 50"

# Перезапуск API
ssh root@185.202.172.59 "pm2 restart hs-api"

# Переменные окружения (.env)
ssh root@185.202.172.59 "cat /var/www/hs-muebles/.env"

# Редактировать .env (например сменить пароль)
ssh root@185.202.172.59 "nano /var/www/hs-muebles/.env"
# После правки .env:
ssh root@185.202.172.59 "pm2 restart hs-api --update-env"
```

---

## База данных

```bash
# Подключиться к БД
ssh root@185.202.172.59 "PGPASSWORD='hs_secure_2024' psql -U hs_user -d hs_muebles -h 127.0.0.1"

# Применить SQL миграцию
ssh root@185.202.172.59 "PGPASSWORD='hs_secure_2024' psql -U hs_user -d hs_muebles -h 127.0.0.1 -f /path/to/migration.sql"
```

**Схема таблиц:** `categories`, `products`, `catalog_versions`, `site_settings`
Подробнее: `server/migrate.sql`

---

## API эндпоинты

| Метод | URL | Доступ |
|---|---|---|
| GET | `/api/catalog` | публичный |
| POST/PUT | `/api/catalog` | только авторизованный |
| GET | `/api/settings` | публичный |
| POST/PUT | `/api/settings` | только авторизованный |
| GET | `/api/admin/login` | — |
| POST | `/api/admin/login` | — |
| DELETE | `/api/admin/login` | — |
| POST | `/api/upload` | только авторизованный |
| GET | `/api/versions` | только авторизованный |
| POST | `/api/versions` | только авторизованный |
| POST | `/api/order` | публичный (rate-limit 5/мин) |

### Заявки из корзины (`/api/order`)

Заявка отправляется в **Telegram** и/или на **email** — каналы включаются
env-переменными в `/var/www/hs-muebles/.env` (см. `.env.example`):

```
TELEGRAM_BOT_TOKEN=...   # бот от @BotFather
TELEGRAM_CHAT_ID=...     # id чата/группы, куда слать заявки
SMTP_HOST=...            # SMTP сервер почты
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
ORDER_EMAIL_TO=...       # получатель (по умолчанию SMTP_USER)
ORDER_EMAIL_FROM=...     # отправитель (по умолчанию SMTP_USER)
```

После правки `.env`: `pm2 restart hs-api --update-env`.
Каждая заявка дублируется в логи PM2 (`pm2 logs hs-api`) — даже если оба канала упали.
Требуется пакет `nodemailer` (`cd /var/www/hs-muebles/server && npm install`).

---

## Загрузка файлов

- **Картинки:** JPG, PNG, WebP, AVIF, GIF — макс. **5 МБ**
- **Видео:** MP4, WebM, MOV, OGV — макс. **200 МБ**
- Хранятся в: `/var/www/hs-muebles/uploads/`
- URL на сайте: `/uploads/<hash>.<ext>`

---

## Важные правила

1. **Всегда используй `vite.config.vps.js`** для сборки, не стандартный `vite.config.js`
   (стандартный подключает Netlify плагин — он не нужен на VPS)

2. **SSH ключ уже настроен** — подключение без пароля работает автоматически

3. **Не деплоить через Netlify MCP** — сайт больше не хостится там

4. **После изменения `.env`** всегда перезапускать с флагом `--update-env`:
   `pm2 restart hs-api --update-env`

5. **SQL миграции** — применять вручную через psql перед деплоем бэкенда
