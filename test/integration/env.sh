#!/bin/sh

get_root_dir() {
  SOURCE="$0"
  if [ -h "$SOURCE" ]; then
    while [ -h "$SOURCE" ]; do
      DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
      SOURCE="$(readlink "$SOURCE")"
      [ "$SOURCE" != "/*" ] && SOURCE="$DIR/$SOURCE"
    done
  fi
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  echo "$DIR"
}

# Retrieve the external IP address of the host machine (on macOS)
# or the IP address of the docker0 interface (on Linux)
# to be used for the Redis cluster announce IP
get_external_ip() {
  if [ "$(uname)" = "Linux" ]; then
    echo "$(ip addr show docker0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)"
  else
    # Need to find a way to support Windows here
    echo "$(route get ifconfig.me | grep interface | sed -e 's/.*: //' | xargs ipconfig getifaddr)"
  fi
}

# set .env values
set -a && .  $(get_root_dir)/test/integration/.env && set +a

# set/override dynamic variables
export REDIS_CLUSTER_ANNOUNCE_IP=$(get_external_ip)
