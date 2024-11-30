#!/usr/bin/env bash
echo "---------------------------------------------------------------------"
echo "Checking if MockServer is available Script..."
echo "---------------------------------------------------------------------"
echo

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo "Loading env vars..."
source $CWD/env.sh

echo
echo "---------------------------------------------------------------------"
echo " Configuring MockServer Instance"
echo "---------------------------------------------------------------------"

is_service_up() {
  docker run --rm --network host byrnedo/alpine-curl -s -X PUT 'http://localhost:1080/status' -d '{"method": "*", "path": "*"}'
}

echo "Waiting for mockserver to start"
until is_service_up; do
  printf "."
  sleep $SLEEP_FACTOR_IN_SECONDS
done

echo
echo "Configuring expectation for mockserver"
docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/.*parties.*" }, "times" : { "remainingTimes" : 0, "unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "body": "{}" } }';
docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/.*participants.*" }, "times" : { "remainingTimes" : 0, "unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "body": "{}" } }';
