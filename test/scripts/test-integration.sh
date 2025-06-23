#!/bin/bash
set -euxo pipefail

docker load -i /tmp/docker-image.tar

npm run dc:up
npm run wait-4-docker

EXIT_CODE=0
npm run test:int || EXIT_CODE="$?"
echo "==> integration tests exited with code: $EXIT_CODE"

npm run dc:down
exit $EXIT_CODE
