#!/bin/sh

echo "** STARTUP - Checking for Account Lookup Service..."

source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for-mysql-als.sh
sh /opt/wait-for/wait-for-mysql-central-ledger.sh

echo "** STARTUP - Account Lookup Service successful!"
