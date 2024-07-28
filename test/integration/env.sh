#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Retrieve the external IP address of the host machine (on macOS)
# or the IP address of the docker0 interface (on Linux)
# to be used for the Redis cluster announce IP
get_external_ip() {
  if [ "$(uname)" == "Linux" ]; then
    echo "$(ip addr show docker0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)"
  else
    # Need to find a way to support Windows here
    echo "$(route get ifconfig.me | grep interface | sed -e 's/.*: //' | xargs ipconfig getifaddr)"
  fi
}

# set .env values
set -a && . $DIR/.env && set +a

# set/override dynamic variables
export REDIS_CLUSTER_ANNOUNCE_IP=$(get_external_ip)
