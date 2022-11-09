# syntax=docker/dockerfile:1
ARG node_env=production

FROM node:16.16 as builder

ENV NODE_ENV $node_env
ENV HOST=0.0.0.0

RUN npm install --location=global npm@8.14.0
RUN npm install --location=global nodemon

WORKDIR /app

COPY *.json ./
RUN npm install --omit=dev

COPY favicon.ico .
COPY *.js ./
RUN npm install --save morgan
RUN npm install --save helmet
RUN npm install --save cors
RUN npm install --save express-rate-limit
RUN npm install --save serve-favicon


CMD [ "node", "index.js" ]

FROM node:16.16 as pkg

RUN npm install --location=global npm@8.14.0
# https://www.npmjs.com/package/pkg
RUN npm install --location=global pkg

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
WORKDIR /app

COPY --from=builder /app /app
RUN pkg package.json

CMD [ "/app/dist/cloud-native-weather-nodejs" ]

FROM gcr.io/distroless/cc-debian11 as runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
WORKDIR /app

COPY --from=pkg /app/favicon.ico /app/favicon.ico
COPY --from=pkg /app/dist/cloud-native-weather-nodejs /app/cloud-native-weather-nodejs
CMD [ "/app/cloud-native-weather-nodejs" ]