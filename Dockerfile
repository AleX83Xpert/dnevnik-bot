#
# I have to downgrade from lts version 20 to 18 to prevent error
#
# unhandledRejection FetchError: request to https://api.telegram.org/bot7517380691:[REDACTED]/getMe failed, reason: 
# at ClientRequest.<anonymous> (/app/node_modules/node-fetch/lib/index.js:1501:11)
# at ClientRequest.emit (node:events:519:28)
# at emitErrorEvent (node:_http_client:108:11)
# at TLSSocket.socketErrorListener (node:_http_client:511:5)
# at TLSSocket.emit (node:events:519:28)
# at emitErrorNT (node:internal/streams/destroy:169:8)
# at emitErrorCloseNT (node:internal/streams/destroy:128:3)
# at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
#   type: 'system',
#   errno: 'ETIMEDOUT',
#   code: 'ETIMEDOUT'
# }
#
# https://github.com/telegraf/telegraf/issues/1961#issuecomment-2093322253
#
# FROM library/node:lts-alpine

FROM library/node:18-alpine
ENV NODE_ENV=production
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
