#!/bin/sh

# script to merge local config/default.json and override.json into one file default.json

jq -s 'reduce .[] as $item ({}; . * $item)' ../../config/default.json ./override.json > ./default.json
