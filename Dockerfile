# FROM node:12.16.1-alpine AS builder
FROM node:12.16.1-alpine
# USER root

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
COPY secrets /opt/account-lookup-service/secrets
COPY src /opt/account-lookup-service/src

# FROM node:12.16.1-alpine
# WORKDIR /opt/account-lookup-service

# # Create empty log file & link stdout to the application log file
# RUN mkdir ./logs && touch ./logs/combined.log
# RUN ln -sf /dev/stdout ./logs/combined.log

# # Create a non-root user: ml-user
# RUN adduser -D ml-user 
# USER ml-user

# COPY --chown=ml-user --from=builder /opt/account-lookup-service .
RUN npm prune --production

EXPOSE 4002
EXPOSE 4001
CMD ["npm", "run", "start"]
