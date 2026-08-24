> I use English due to open source, and Russian due to the project's purpose.

# Here's an example / И сразу пример
Telegram: https://t.me/dnevnik66_bot
Max: https://max.ru/se13902840_bot

# What is that / Что это
### en
This is a multi-transport bot (Telegram, MAX) that makes using the Sverdlovsk Region's electronic school diary much more convenient than the diary https://dnevnik.egov66.ru itself.
### ru
Это мульти-транспортный бот (Telegram, MAX), дающий возможность гораздо удобнее пользоваться электронным школьным дневником Свердловской области, чем сам дневник https://dnevnik.egov66.ru.

# Why / Мотивация
### en
To log in to the Sverdlovsk Region's electronic school diary, you first need to log in to Gosuslugi (the government services portal). To log in to Gosuslugi, you have to receive an SMS with a code. To receive the SMS code, you need to enter your username and password. And this happens every single time. Every. Damn. Time.
### ru
Чтобы залогиниться в электронный школьный дневник Свердловской области, нужно сначала залогиниться на Госуслуги. Чтобы залогиниться на Госуслуги, нужно получить СМС с кодом. Чтобы получить СМС с кодом нужно ввести логин и пароль. И так каждый раз. Каждый. Чёртов. Раз.

# Pros / Преимущества
### en
- No need to log in via Gosuslugi every time.
- Telegram chat keeps the full history — no admin can retroactively change anything.
### ru
- Не нужно каждый раз логиниться через госуслуги.
- Чат телеграма хранит всю историю, рука администратора ничего не исправит задним числом.

# Cons / Недостатки
### en
- To connect the bot to the diary, you'll need to do a couple of squats. (figuratively — it's a bit of a hassle)
- Sometimes, when the diary server is down, you have to reconnect the bot all over again.
### ru
- Чтобы подключить бота к дневнику нужно сделать пару приседаний.
- Иногда, когда сервер дневника лежит, приходится заново подключать бота.

# How it looks / Как выглядит
<p float="left">
  <img src="https://github.com/user-attachments/assets/5319002c-9a1c-489c-bbfc-8b9e3fec2a22" width="30%" />
  <img src="https://github.com/user-attachments/assets/772a45d4-557d-47ca-bea8-c1166af49da2" width="30%" />
  <img src="https://github.com/user-attachments/assets/16129604-1a6d-4c1d-b84a-6745660c9cae" width="30%" />
  <img src="https://github.com/user-attachments/assets/20928ade-2080-4042-8de4-0c059f8cfd58" width="30%" />
  <img src="https://github.com/user-attachments/assets/d01873ee-3d3f-4bcc-abc1-93351d77ac40" width="30%" />
  <img src="https://github.com/user-attachments/assets/06fd06e6-485a-4a20-bd58-f1890c4b4484" width="30%" />
  <img src="https://github.com/user-attachments/assets/b35d06c5-60eb-407f-a57d-059d23f19031" width="30%" />
  <img src="https://github.com/user-attachments/assets/00d29faa-23a9-42c6-8888-d87efe19b1e8" width="30%" />
</p>

# How to start locally / Локальный запуск
1. Create `.env` file in the root (see `.env.example`)

2. Start databases
```bash
docker compose up -d
```

3. Start project
```bash
npm run dev
```

4. Run tests
```bash
npm run test
```

# Multi-transport support / Мульти-транспортная поддержка
### en
The bot supports multiple messenger platforms (transports). Currently:
- **Telegram** — via Telegraf, using WebApp for token delivery
- **MAX** — via @maxhub/max-bot-api, using a mini-app with HTTP POST for token delivery

Adding a new transport is purely additive: implement a `TransportAdapter`, create a `transports/<platform>/bot.ts`, and wire it in `keystone.ts`. No core files change.

At least one transport token is required (`TELEGRAM_BOT_TOKEN` or `MAX_BOT_TOKEN`).
### ru
Бот поддерживает несколько мессенджеров (транспортов). Сейчас:
- **Telegram** — через Telegraf, использует WebApp для передачи токенов
- **MAX** — через @maxhub/max-bot-api, использует мини-приложение с HTTP POST для передачи токенов

Добавление нового транспорта — чисто аддитивное: реализуйте `TransportAdapter`, создайте `transports/<platform>/bot.ts` и подключите в `keystone.ts`. Ядро не меняется.

Требуется хотя бы один токен транспорта (`TELEGRAM_BOT_TOKEN` или `MAX_BOT_TOKEN`).

# PostgreSQL Version Upgrade / Обновление версии PostgreSQL

When upgrading PostgreSQL between major versions (e.g., 16 → 18), data migration is required due to incompatible data formats.

## Backup and Upgrade Process / Процесс резервного копирования и обновления

### Method 1: Dump/Restore (Recommended / Рекомендуется)
```bash
# 1. Backup current data
docker exec postgresdb pg_dumpall > backup.sql

# 2. Stop PostgreSQL container
docker compose stop postgresdb

# 3. Update image version in docker-compose.yml
# Change: image: postgres:16 → image: postgres:18.1

# 4. Remove old data directory (WARNING: This deletes current data!)
rm -rf ./pgdata/*

# 5. Start with new version
docker compose up -d postgresdb

# 6. Restore data
docker exec -i postgresdb psql < backup.sql
```

## Important Notes / Важные заметки
- Always test migration on staging first / Всегда тестируйте миграцию на стейдинге
- Keep backups before any upgrade / Сохраняйте резервные копии перед обновлением
- Check application compatibility with new PostgreSQL version / Проверьте совместимость приложения с новой версией PostgreSQL
- Plan for downtime during major version upgrades / Планируйте простой во время обновления между основными версиями
