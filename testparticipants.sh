#!/usr/bin/env bash
curl --request GET \
  --url "http://localhost:$1/participants/msisdn/22504004762" \
  --header 'Content-Type: application/vnd.interoperability.participants+json;version=1.0' \
  --header 'Accept: application/vnd.interoperability.participants+json;version=1' \
  --header 'Date: 2018-06-21T18:22:56.694Z' \
  --header 'FSPIOP-Source: test participant'
