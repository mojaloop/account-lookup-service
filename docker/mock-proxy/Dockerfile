ARG NODE_VERSION=22-alpine
ARG USERNAME=ml-user

FROM node:${NODE_VERSION}
ARG USERNAME

WORKDIR /opt/app
COPY tsconfig.json package*.json ./
COPY src ./src
RUN npm ci

RUN adduser -D ${USERNAME}
USER ${USERNAME}

CMD [ "npm" , "start" ]
