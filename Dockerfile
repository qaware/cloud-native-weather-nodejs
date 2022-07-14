# syntax=docker/dockerfile:1
FROM node:16.16 as builder

RUN npm install --location=global npm@8.14.0
RUN npm install --location=global pkg

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
WORKDIR /app

COPY *.json ./
RUN npm install --omit=dev

COPY favicon.ico .
COPY *.js ./

CMD [ "node", "index.js" ]
