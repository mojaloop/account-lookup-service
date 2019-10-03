#!/bin/sh

echo "** STARTUP - Checking for Account-Lookup-Service..."

# TODO: these envs aren't so friendly
source /opt/wait-for/wait-for.env

sh /opt/wait-for/wait-for-mysql.sh

echo "** STARTUP - Account-Lookup-Service successful!"
