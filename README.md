# Account Lookup Service
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/account-lookup-service.svg?style=flat)](https://github.com/mojaloop/account-lookup-service/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/account-lookup-service.svg?style=flat)](https://github.com/mojaloop/account-lookup-service/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/account-lookup-service.svg?style=flat)](https://hub.docker.com/r/mojaloop/account-lookup-service)
[![CircleCI](https://circleci.com/gh/mojaloop/account-lookup-service.svg?style=svg)](https://app.circleci.com/pipelines/github/mojaloop/account-lookup-service)


## Documentation
- [Documentation](http://docs.mojaloop.io/documentation/mojaloop-technical-overview/account-lookup-service/)
- [API Swagger Reference](/src/interface/api-swagger.yaml)
- [Admin Swagger Referemce](/src/interface/admin-swagger.yaml)

## Database initialisation

You can start the database easily within docker, using docker-compose:
```bash
docker-compose up mysql-als
```


To populate the database with tables and seeded valued, ensure that the correct database URI is in the `default.json` file, or set the `ALS_DATABASE_URI` accordingly,  and run the following command:

```bash
npm run migrate
```

## Start API
To run the API and/or Admin servers run the following commands

### Both Admin + API
```bash
#NPM: 
npm start

#CLI: 
node src/index.js server
```

### API 
```bash
#NPM: 
npm run start:api

#CLI: 
node src/index.js server --api
```

### Admin 
```bash
#NPM: 
npm run start:admin

#CLI: 
node src/index.js server --admin
```

## Tests

### Unit Testing 

Running unit tests
```bash
npm run test:unit
```

### Code Coverage
```bash
npm run test:coverage-check
```

### Integration tests

The integration tests use `docker-compose` to spin up a test environment for running the integration tests.
The tests are executed inside a standalone `account-lookup-service-int` container, defined in `docker-compose.integration.yml`.

Run the tests in a standalone mode with:
```bash
npm run test:integration
```

By default, the test results will be available in `/tmp/junit.xml`. See below to configure the output directory and file name of the test results.


#### Running integration tests repetitively

In order to debug and fix broken integration tests, you may want to run the tests without tearing down the environment every time. To do this, you can set `TEST_MODE` to `wait`, which sets up the integration runner to start the docker containers, run the migrations, and then wait for you to log into the `account-lookup-service-int` container and run the tests yourself.

>*Note: The docker-compose.integration.yml file mounts the `./src` and `./test` directories inside the docker-container, so you can re-run your tests repeatedly without removing and rebuilding your containers each time.*

For example:

```bash
export TEST_MODE=wait
npm run test:integration
# containers will now be ready and waiting for the tests

# log into the `account-lookup-service-int` container
docker exec -it als_account-lookup-service-int sh

# now run the integration tests
npm run test:int

```

You can then stop and remove the containers with the following commands:
```bash
docker-compose -f docker-compose.yml -f docker-compose.integration.yml stop
docker-compose -f docker-compose.yml -f docker-compose.integration.yml rm -f
```

#### Environment Variables:

| Environment variable      | Description | Example values | Default Value |
| ------------------------- | ----------- | -------------- | ------------- |
| `TEST_MODE`               | The mode that `integration-runner.sh` uses. See `./test/integration-runner.sh` for more information. | `default`, `wait`, `rm` | `default` |
| `JEST_JUNIT_OUTPUT_DIR`   | The output directory (inside the docker container) for the jest runner | `/tmp`, `/opt/account-lookup-service/test/results` | `/tmp` |
| `JEST_JUNIT_OUTPUT_NAME`  | The filename (inside the docker container) for the jest runner         | `junit.xml` | `junit.xml` |
| `RESULTS_DIR`             | The output directory (on the host machine) that the test results is copied to | `/tmp` | `/tmp` |


## Auditing Dependencies

We use `npm-audit-resolver` along with `npm audit` to check dependencies for vulnerabilities, and keep track of resolved dependencies with an `audit-resolve.json` file.

To start a new resolution process, run:
```bash
npm run audit:resolve
```

You can then check to see if the CI will pass based on the current dependencies with:
```bash
npm run audit:check
```

And commit the changed `audit-resolve.json` to ensure that CircleCI will build correctly.

## Container Scans

As part of our CI/CD process, we use anchore-cli to scan our built docker container for vulnerabilities upon release.

If you find your release builds are failing, refer to the [container scanning](https://github.com/mojaloop/ci-config#container-scanning) in our shared Mojaloop CI config repo. There is a good chance you simply need to update the `mojaloop-policy-generator.js` file and re-run the circleci workflow.

For more information on anchore and anchore-cli, refer to:
- [Anchore CLI](https://github.com/anchore/anchore-cli)
- [Circle Orb Registry](https://circleci.com/orbs/registry/orb/anchore/anchore-engine)



## Additional Notes: 

- For all put parties callbacks `FSPIOP-Destination` header is considered to be mandatory. 
