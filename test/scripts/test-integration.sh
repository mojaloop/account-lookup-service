#!/bin/bash
set -euxo pipefail

npm run dc:up
npm run wait-4-docker

EXIT_CODE=0
npm run test:int || EXIT_CODE="$?"
echo "==> integration tests exited with code: $EXIT_CODE"

exit $EXIT_CODE
