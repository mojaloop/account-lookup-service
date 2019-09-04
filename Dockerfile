FROM node:10.15.3-alpine

WORKDIR /opt/account-lookup-service

RUN echo "https://mirror.csclub.uwaterloo.ca/alpine/v3.9/main" > /etc/apk/repositories
RUN echo "https://mirror.csclub.uwaterloo.ca/alpine/v3.9/community" >>/etc/apk/repositories

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
COPY src /opt/account-lookup-service/src

EXPOSE 4002
EXPOSE 4001
CMD ["npm", "run", "start"]
