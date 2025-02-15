# How to start locally
```bash
docker compose up -d
npm start
```

# How to start on prod (just an example)

You may use docker-compose.prod.yml

1. Create .env file on prod server (see .env.example)

2. Build app & load balancer
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
4. Go to directory with .env and docker-compose.yml
5. Down&up containers
