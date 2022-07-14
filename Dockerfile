# syntax=docker/dockerfile:1
FROM node:16.16 as builder

ENV NODE_ENV=production
WORKDIR /app

COPY *.json .
RUN npm install --production

COPY *.js .

CMD [ "node", "index.js" ]
