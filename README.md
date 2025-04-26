> I use English due to open source, and Russian due to the project's purpose.

# Here's an example / И сразу пример
https://t.me/dnevnik66_bot

# What is that / Что это
### en
This is a Telegram bot that makes using the Sverdlovsk Region's electronic school diary much more convenient than the diary https://dnevnik.egov66.ru itself.
### ru
Это телеграм бот, дающий возможность гораздо удобнее пользоваться электронным школьным дневником Свердловской области, чем сам дневник https://dnevnik.egov66.ru.

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
npm start
```

4. Run tests
```bash
npm run test
```

# How to start on prod (just an example) / Пример старта на проде

Using only prepared docker images.

You may use `docker-compose.prod.yml`.

1. Create `.env` file on prod server (see `.env.example`)

2. Build images for the app & load balancer
```bash
docker build . -t dnevnik-app:latest
docker build ./infra/load-balancer/ -t load-balancer:latest
```

2. Upload images to server
```bash
docker save dnevnik-app:latest | ssh user@server "docker load"
docker save load-balancer:latest | ssh user@server "docker load"
```

3. Login to server via ssh
4. Go to directory with `.env` and `docker-compose.yml`
5. Down&up containers

> P.S. You need to migrate database if starting first time or if you created new migrations. Use `npm run migrate-apply` from the container
