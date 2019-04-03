FROM node:8.11.3-alpine

WORKDIR /src

CMD ["node", "/src/server.js"]

COPY package.json ./src/package-lock.json /src/
COPY ./src/lib/pathfinder/package.json /src/lib/pathfinder/package.json
COPY ./src/lib/error/package.json /src/lib/error/package.json
COPY ./src/lib/logger/package.json /src/lib/logger/package.json
COPY ./src/lib/requests/package.json /src/lib/requests/package.json
COPY ./src/lib/validation/package.json /src/lib/validation/package.json
COPY ./src/lib/e164/package.json /src/lib/e164/package.json
COPY src/models /src/model/package.json
RUN npm install --production

COPY ./src/ /src/
