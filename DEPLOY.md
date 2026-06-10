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
| Сайт | `http://185.202.172.59` |
| Папка проекта | `/var/www/hs-muebles/` |

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
| **Nginx Proxy Manager** | Docker, порты 80/443, проксирует на Express :4000 |
| **PostgreSQL 16** | БД `hs_muebles`, пользователь `hs_user` |
| **Express** | порт `4000`, отдаёт и API и статику |

---

## Полный деплой (фронтенд + бэкенд)

Когда изменился и фронтенд (src/) и бэкенд (server/):

```bash
# 1. Собрать фронтенд (без Netlify плагина!)
npm run build -- --config vite.config.vps.js

# 2. Скопировать dist/ на сервер
scp -r dist root@185.202.172.59:/var/www/hs-muebles/

# 3. Скопировать изменённые файлы сервера
scp server/index.js server/store.js server/settings.js server/auth.js root@185.202.172.59:/var/www/hs-muebles/server/

# 4. Перезапустить API
ssh root@185.202.172.59 "pm2 restart hs-api"
```

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
