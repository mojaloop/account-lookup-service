FROM node:12.16.0-alpine

WORKDIR /opt/account-lookup-service

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/account-lookup-service/
RUN npm install --production

RUN apk del build-dependencies

COPY config /opt/account-lookup-service/config
COPY migrations /opt/account-lookup-service/migrations
COPY seeds /opt/account-lookup-service/seeds
COPY secrets /opt/account-lookup-service/secrets
COPY src /opt/account-lookup-service/src

EXPOSE 4002
CMD ["npm", "run", "start:admin"]
