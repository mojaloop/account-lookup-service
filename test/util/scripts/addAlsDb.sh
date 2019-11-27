#!/usr/bin/env bash
echo "---------------------------------------------------------------------"
echo " Adding ALS database and user to existing ${DB_ID} Instance"
echo "---------------------------------------------------------------------"

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo "Loading env vars..."
source $CWD/env.sh

docker stop $DB_ID
echo "Starting container ${DB_ID}"
docker start $DB_ID
exit_code=$?

if [ "$exit_code" = "0" ]
then
  docker exec -it ${DB_ID} mysql -uroot -e "DROP SCHEMA IF EXISTS account_lookup;"
  docker exec -it ${DB_ID} mysql -uroot -e "CREATE SCHEMA account_lookup;"
  docker exec -it ${DB_ID} mysql -uroot -e "DROP USER IF EXISTS account_lookup@'%';"
  docker exec -it ${DB_ID} mysql -uroot -e "CREATE USER account_lookup@'%' IDENTIFIED WITH mysql_native_password BY '$DBPASS';"
  docker exec -it ${DB_ID} mysql -uroot -e "GRANT ALL PRIVILEGES ON account_lookup.* TO 'account_lookup'@'%';"
  docker exec -it ${DB_ID} mysql -uroot -e "FLUSH PRIVILEGES;"
else
  >&2 echo "{$DB_ID} container does not exist "
fi

echo "${DB_ID} ALS database ready to accept requests..."
