FROM mhart/alpine-node:10.15.1

WORKDIR /opt/account-lookup-service
COPY . /opt/account-lookup-service

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 4002
CMD node src/index.js server --api
