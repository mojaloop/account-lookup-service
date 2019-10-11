#!/bin/sh

echo "** STARTUP - Checking for DB connection..."

source /opt/wait-for/wait-for.env

apk --no-cache add mysql-client

until result=$(mysql -h $WAIT_FOR_DB_HOST_CL -P $WAIT_FOR_DB_PORT_CL -u $WAIT_FOR_DB_USER_CL --password=$WAIT_FOR_DB_PASSWORD_CL  $WAIT_FOR_DB_DATABASE_CL -ss -N -e 'select 1;') && eval 'echo is_connected=$result' && if [ -z $result ]; then false; fi && if [ $result -ne 1 ]; then false; fi; do echo waiting for MySQL; sleep 2; done;

echo "** STARTUP - DB connection successful!"
