#!/usr/bin/env bash

###
# integration-runner.sh
#
# A basic integration test runner using docker-compose
###

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

##
# TEST_MODE
# Options:
# - default   runs the tests as usual
# - wait      sets up the docker-compose environment, but don't do anything (this allows for repeat tests)
# - rm        same as default, but stops and removes docker-compose containers afterwards
###
TEST_MODE="${TEST_MODE:-"default"}"


# Controls where Jest places test outputs inside of `als_account-lookup-service-int` container
JEST_JUNIT_OUTPUT_DIR="${JEST_JUNIT_OUTPUT_DIR:-"/tmp"}"
JEST_JUNIT_OUTPUT_NAME="${JEST_JUNIT_OUTPUT_NAME:-"junit.xml"}"

# Test output on host machine
RESULTS_DIR="${RESULTS_DIR:-"/tmp"}"

function startDocker() {
  npm run dc:up
  docker-compose \
    -f ${DIR}/../docker-compose.integration.yml \
    up -d
}

function waitForDocker() {
  echo 'Waiting for docker services to be healthy'
  HEALTHY_COUNT=$(docker ps | grep "healthy" | wc -l)
  EXPECTED_HEALTHY_COUNT=5
  EXPECTED_SERVICE_COUNT=6
  while [ $(docker ps | grep "healthy" | wc -l) -lt $EXPECTED_HEALTHY_COUNT ]; do
    TOTAL_SERVICES=$(docker ps | grep "als_*" | wc -l)
    # exit early if we don't have the required services
    if [ ${TOTAL_SERVICES} -lt ${EXPECTED_SERVICE_COUNT} ]; then
      echo 'Not all docker-compose services are running. Check the logs and try again.'
      exit 1
    fi

    echo "."
    sleep 5
  done
}

function runMigration() {
  docker exec -it als_account-lookup-service sh -c "npm run migrate"
}

function runTests() {
  docker exec -it als_account-lookup-service-int sh -c "JEST_JUNIT_OUTPUT_DIR=${JEST_JUNIT_OUTPUT_DIR} JEST_JUNIT_OUTPUT_NAME=${JEST_JUNIT_OUTPUT_NAME} npm run test:int"
}

function copyResults() {
  echo "Copying results from: ${JEST_JUNIT_OUTPUT_DIR}/${JEST_JUNIT_OUTPUT_NAME} to: ${RESULTS_DIR}"
  docker cp als_account-lookup-service-int:${JEST_JUNIT_OUTPUT_DIR}/${JEST_JUNIT_OUTPUT_NAME} ${RESULTS_DIR}
}

function tearDown() {
  docker-compose \
    -f ${DIR}/../docker-compose.yml \
    -f ${DIR}/../docker-compose.integration.yml \
    stop
  docker-compose \
    -f ${DIR}/../docker-compose.yml \
    -f ${DIR}/../docker-compose.integration.yml \
    down -v
  docker-compose \
    -f ${DIR}/../docker-compose.yml \
    -f ${DIR}/../docker-compose.integration.yml \
    rm -f
}

startDocker
waitForDocker
runMigration

case ${TEST_MODE} in
  default)
    runTests
    EXIT_RESULT=$?
    copyResults
    exit ${EXIT_RESULT}
  ;;

  wait)
    echo 'Running tests in `wait` mode'
  ;;

  rm)
    runTests
    EXIT_RESULT=$?
    copyResults
    tearDown
    exit ${EXIT_RESULT}
  ;;

  *)
    echo "Unsupported TEST_MODE: ${TEST_MODE}"
    exit 1
esac
