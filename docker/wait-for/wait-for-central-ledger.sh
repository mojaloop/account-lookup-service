#!/bin/sh

echo "** STARTUP - Checking for Central-Ledger..."

source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for-mysql-central-ledger.sh

sh /opt/wait-for/wait-for-kafka.sh

echo "** STARTUP - Central-Ledger successful!"
