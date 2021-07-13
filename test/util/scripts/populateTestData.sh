#!/usr/bin/env bash
echo "---------------------------------------------------------------------"
echo "Starting script to populate test data.."
echo "---------------------------------------------------------------------"
echo

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo "Loading env vars..."
source $CWD/env.sh

echo "---------------------------------------------------------------------"
echo "Registering Oracles for MSISDNs."
echo "---------------------------------------------------------------------"
curl --location ${ACCOUNT_LOOKUP_ADMIN_URI_PREFIX}://${ACCOUNT_LOOKUP_ADMIN_HOST}:${ACCOUNT_LOOKUP_ADMIN_PORT}${ACCOUNT_LOOKUP_ADMIN_BASE}oracles \
--header 'Cache-Control: no-cache' \
--header 'Content-Type: application/json' \
--header 'cache-control: no-cache' \
--header 'FSPIOP-Source: populateTestData.sh' \
--header 'Date: Thu, 24 Jan 2019 10:22:12 GMT' \
--data-raw '{
    "oracleIdType": "MSISDN",
    "endpoint": {
      "value": "http://localhost:8444/oracle",
      "endpointType": "URL"
    },
    "currency": "USD",
    "isDefault": true
  }'

echo
echo "---------------------------------------------------------------------"
echo " Creating TestData for $FSPList"
echo "---------------------------------------------------------------------"
echo " Prerequisites for Central-Ledger:"
echo "    1. Ensure you run 'npm run migrate'"
echo "    2. The below requests only work for the 'ADMIN' API"

for PAYEE_PARTICIPANT in "${PAYEE_PARTICIPANT_LIST[@]}"
do
  echo ''
  echo "*********************************************************************"
  echo ''
  echo
  echo "Creating participants '$PAYEE_PARTICIPANT'"
  echo "---------------------------------------------------------------------"
  curl --location ${ACCOUNT_LOOKUP_FSPIOP_URI_PREFIX}://${ACCOUNT_LOOKUP_FSPIOP_HOST}:${ACCOUNT_LOOKUP_FSPIOP_PORT}${ACCOUNT_LOOKUP_FSPIOP_BASE}participants/MSISDN/${PAYEE_PARTICIPANT} \
    --header 'Cache-Control: no-cache' \
    --header 'Content-Type: application/vnd.interoperability.participants+json;version=1.0' \
    --header 'Date: Thu, 24 Jan 2019 10:22:12 GMT' \
    --header 'FSPIOP-Source: payeefsp' \
    --header 'Accept: application/vnd.interoperability.participants+json;version=1.0' \
    --data-binary '{
      "fspId": "payeefsp",
      "currency": "USD"
    }'
done
