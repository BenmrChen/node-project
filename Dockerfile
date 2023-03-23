FROM node:16.17.1-alpine

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

WORKDIR /usr/src/node-app

COPY package.json yarn.lock ./

USER node

RUN yarn install --production --pure-lockfile

COPY --chown=node:node . .

EXPOSE 3200

CMD ["yarn", "start"]
