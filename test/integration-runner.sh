#!/usr/bin/env bash

#TODO: is there a way we can get away without this file?


DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function startDocker() {
  docker-compose up -f ${DIR}/../docker-compose.integration.yml
}
