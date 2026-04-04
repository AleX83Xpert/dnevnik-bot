FROM library/node:24-alpine
ENV NODE_ENV=production
RUN apk add --no-cache openssl
RUN mkdir /app
WORKDIR /app
RUN chown -R node:node /app
COPY package*.json /app/
RUN npm ci --omit=dev
RUN npm cache clean --force
RUN npm run disable-telemetry
COPY . /app
RUN echo "# .env for build step" >> /app/.env && \
  echo "NODE_ENV=production" >> /app/.env && \
  echo "TOKENS_ENCRYPTION_KEY=someRandomString32SymbolsLength!" >> /app/.env
RUN npm run build
RUN rm /app/.env
USER node
CMD [ "npm", "start" ]
