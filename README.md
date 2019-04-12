# Account Lookup Server
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/account-lookup-service.svg?style=flat)](https://github.com/mojaloop/account-lookup-service/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/account-lookup-service.svg?style=flat)](https://github.com/mojaloop/account-lookup-service/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/account-lookup-service.svg?style=flat)](https://hub.docker.com/r/mojaloop/account-lookup-service)
[![CircleCI](https://circleci.com/gh/mojaloop/account-lookup-service.svg?style=svg)](https://circleci.com/gh/mojaloop/account-lookup-service)



## Documentation
[Documentation](http://mojaloop.io/documentation/mojaloop-technical-overview/account-lookup-service/) \
[API Swagger](http://mojaloop.io/documentation/api/#als-oracle-api) \
[Admin Swagger](http://mojaloop.io/documentation/api/#als-oracle-api) <!--This currently points to API but will be updated when Admin documentation is created-->


## Database initialisation
To populate the database with tables and seeded valued, ensure that the correct database URI is in the default.json and then run the following command
 ```bash
 npm run migrate
 ```
 
## Start API
To run the API and/or Admin servers run the following commands
##### Both 
```bash
NPM: npm start

CLI: node src/index.js server
```
##### API 
```bash
NPM: npm run start:api

CLI: node src/index.js server --api
```
##### Admin 
```bash
NPM: npm run start:admin

CLI: node src/index.js server --admin
```

## Tests

##### Unit Testing 

Running the test:
```bash
NPM: npm run test

CLI: ava test/unit/**/**.test.js
```