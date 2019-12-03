FROM node:10.15.3-alpine AS builder

WORKDIR /opt/account-lookup-service

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/account-lookup-service/
RUN npm install

COPY config /opt/account-lookup-service/config
COPY migrations /opt/account-lookup-service/migrations
COPY seeds /opt/account-lookup-service/seeds
COPY src /opt/account-lookup-service/src

FROM node:10.15.3-alpine

WORKDIR /opt/account-lookup-service

COPY --from=builder /opt/account-lookup-service .
RUN npm prune --production

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log
RUN ln -sf /dev/stdout ./logs/combined.log

EXPOSE 4002
EXPOSE 4001
CMD ["npm", "run", "start"]
