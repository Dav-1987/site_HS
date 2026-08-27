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

**Канонический хост:** публичным является только `https://hsmuebles.es`.
Nginx должен одним `301` перенаправлять `http://hsmuebles.es`,
`http://www.hsmuebles.es` и `https://www.hsmuebles.es` на тот же путь и query
на `https://hsmuebles.es`. IP-адрес не должен отдавать копию сайта.

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

> **Маршрутизация HTML:** nginx отдаёт prerender-файлы сам (`try_files $uri $uri/index.html @spa`),
> и только если файла нет — уходит в `location @spa` → Express :4000. Именно оттуда работают
> 301-редиректы на переехавшие товары (`server/redirects.js`) и 404-статус для несуществующих
> страниц (`server/index.js`, catch-all). Если вернуть `=404` вместо `@spa`, Express перестанет
> видеть HTML-запросы и редиректы молча умрут. Бэкапы конфига: `/root/hs-muebles.nginx.bak-*`.
| **certbot** | Let's Encrypt SSL для `hsmuebles.es`, авто-продление `certbot.timer` |
| **PostgreSQL 16** | БД `hs_muebles`, пользователь `hs_user` |
| **Express** | порт `4000`, отдаёт API; статику отдаёт nginx напрямую |

---

## Полный деплой (фронтенд + бэкенд)

Когда изменился и фронтенд (src/) и бэкенд (server/):

```bash
# 1. Проверить, собрать SEO-снимки и атомарно развернуть фронтенд
npm run deploy:seo

# 2. Скопировать изменённые файлы сервера
scp server/index.js server/redirects.js server/store.js server/settings.js server/auth.js server/order.js server/notify.js server/feed.js root@185.202.172.59:/var/www/hs-muebles/server/
scp src/data/catalog.js root@185.202.172.59:/var/www/hs-muebles/src/data/

# 3. Перезапустить API
ssh root@185.202.172.59 "pm2 restart hs-api"
```

> Если менялся `server/package.json` (новые зависимости), перед перезапуском:
> `ssh root@185.202.172.59 "cd /var/www/hs-muebles/server && npm ci --omit=dev"`
>
> Клиент и API требуют Node.js 20.9 или новее. На VPS перед обновлением
> зависимостей проверьте `node --version`.

---

## Пересборка каталога (SEO) — кнопка «Пересобрать сайт» в /admin

Правки каталога/настроек через `/admin` попадают в БД и видны на сайте сразу
(`/api/*`), но prerendered HTML (то, что видит Google) обновляется только
пересборкой — `npm run build:seo` + деплой `dist/`. Кнопка в админке гоняет
это на **GitHub Actions**, не на VPS: сервер общий (1 vCPU, ~2 ГБ RAM уже в
свопе при обычной нагрузке, диск >90% занят чужими Docker-сервисами — n8n,
несколько ботов), `vite build` там рисковал уронить и сайт, и соседей.

- Workflow: `.github/workflows/rebuild-deploy.yml` (`workflow_dispatch`) —
  запускается только для `main`; выполняет чистую установку клиентских и серверных
  зависимостей → security-аудит → lint и тесты → `catalog:pull` → `build:seo`
  с браузерной проверкой → сохраняет проверенный `dist` как артефакт → деплоит
  на VPS по SSH через `scripts/deploy-dist.mjs`.
- После переключения релиза workflow проверяет публичный маркер сборки и
  `/api/health`. При ошибке предыдущая версия `dist` восстанавливается автоматически.
- Триггерит и опрашивает статус `server/rebuild.js` через GitHub API —
  нужен `GH_REBUILD_TOKEN` в `.env` (fine-grained PAT, только этот репозиторий,
  Actions: Read and write; см. `.env.example`). Без токена кнопка в админке
  не отображается.
- Деплой в workflow идёт через **отдельный** SSH-ключ (не личный ключ
  разработчика) — публичная часть добавлена в `authorized_keys` на VPS,
  приватная лежит в GitHub Secrets (`VPS_SSH_KEY`, `VPS_HOST_KEY`). Ключ можно
  отозвать независимо: удалить строку из `authorized_keys` на сервере и
  сгенерировать новый (`gh secret set VPS_SSH_KEY --repo Dav-1987/site_HS`).
- Ручной запуск без кнопки: `gh workflow run rebuild-deploy.yml --repo Dav-1987/site_HS`.

---

## Деплой только фронтенда

Когда изменился только src/ (React компоненты, страницы, стили):

```bash
npm run deploy:seo
```
Перезапуск PM2 **не нужен** — статика отдаётся напрямую.

---

## Деплой только бэкенда

Когда изменились только server/*.js файлы:

```bash
scp server/index.js server/store.js server/settings.js server/feed.js root@185.202.172.59:/var/www/hs-muebles/server/
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
Требуется пакет `nodemailer` (`cd /var/www/hs-muebles/server && npm ci --omit=dev`).

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

6. **Обычный `npm run build` не деплоить** — он создаёт только SPA-оболочку без
   prerender-страниц и sitemap. Для любого публичного фронтенд-деплоя использовать
   `npm run deploy:seo`; встроенный SEO-гейт остановит публикацию неполной сборки.

7. **Миграция раньше фронтенда.** Если фронтенд начинает читать новое поле каталога,
   порядок строго такой: сначала psql-миграция, затем `scp server/*` + `pm2 restart`,
   и только потом `npm run catalog:pull` и `npm run deploy:seo`. Иначе `/api/catalog`
   какое-то время отдаёт данные без нового поля, и фронтенд отработает по значению
   по умолчанию — например, покажет раздел, который должен быть скрыт.

8. **`src/data/catalog.js` тоже деплоится.** `server/feed.js` импортирует его
   (`../src/data/catalog.js`) — товарный фид намеренно считает цену, скидку, заголовок
   и наличие тем же кодом, что и страница товара, иначе фид и посадочная разъезжаются
   и Merchant Center отклоняет товары. Файла нет на VPS → API **не стартует**:
   `scp src/data/catalog.js root@185.202.172.59:/var/www/hs-muebles/src/data/`

9. **Роуты фидов требуют правила в nginx.** `/feed/google.xml`, `/feed/meta.xml` и
   `/feed/pinterest.xml` отдаёт Express, но `location /` сначала ищет файл на диске,
   поэтому нужен отдельный `location /feed/` с `proxy_pass http://127.0.0.1:4000`
   (уже добавлен). Без него — молчаливый 404, и платформы не заберут фиды.

10. **`src/data/settings.default.json` тоже деплоится.** `server/settings.js` читает
   этот файл с диска (`../src/data/settings.default.json`), поэтому при добавлении
   новых настроек его нужно копировать вместе с серверными файлами:
   `scp src/data/settings.default.json root@185.202.172.59:/var/www/hs-muebles/src/data/`
