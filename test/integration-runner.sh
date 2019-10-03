#!/usr/bin/env bash

###
# integration-runner.sh
#
# A basic integration test runner using docker-compose
###

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#internal to docker
JEST_JUNIT_OUTPUT_DIR="${JEST_JUNIT_OUTPUT_DIR:-"/tmp"}"
JEST_JUNIT_OUTPUT_NAME="${JEST_JUNIT_OUTPUT_NAME:-"junit.xml"}"

#on host machine
RESULTS_DIR="${RESULTS_DIR:-'/tmp'}"

function startDocker() {
  docker-compose \
    -f ${DIR}/../docker-compose.yml \
    -f ${DIR}/../docker-compose.integration.yml \
    up -d
}

function waitForDocker() {
  echo 'Waiting for docker'
  docker exec -it als_account-lookup-service sh -c "/opt/wait-for/wait-for-account-lookup-service.sh && echo 'ready for tests'"
}

function runMigration() {
  docker exec -it als_account-lookup-service sh -c "npm run migrate"
}

function runTests() {
  docker exec -it als_account-lookup-service sh -c "JEST_JUNIT_OUTPUT_DIR=${JEST_JUNIT_OUTPUT_DIR} JEST_JUNIT_OUTPUT_NAME=${JEST_JUNIT_OUTPUT_NAME} npm run test:int"
}

function copyResults() {
  echo "Copying results from: ${JEST_JUNIT_OUTPUT_DIR}/${JEST_JUNIT_OUTPUT_NAME} to: ${RESULTS_DIR}"
  docker cp als_account-lookup-service:${JEST_JUNIT_OUTPUT_DIR}/${JEST_JUNIT_OUTPUT_NAME} ${RESULTS_DIR}
}

startDocker
waitForDocker
runMigration
runTests
EXIT_RESULT=$?
copyResults

exit $?