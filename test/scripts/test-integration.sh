#!/bin/bash
set -euxo pipefail

docker load -i /tmp/docker-image.tar

npm run dc:up
npm run wait-4-docker

npm run test:int || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests exited with code: $INTEGRATION_TEST_EXIT_CODE"

docker-compose down
exit $INTEGRATION_TEST_EXIT_CODE
