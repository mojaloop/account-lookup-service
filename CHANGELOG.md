# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [14.0.0](https://github.com/mojaloop/account-lookup-service/compare/v13.0.0...v14.0.0) (2022-06-20)


### ⚠ BREAKING CHANGES

* **mojaloop/#2092:** Major version bump for node v16 LTS support, re-structuring of project directories to align to core Mojaloop repositories and docker image now uses `/opt/app` instead of `/opt/account-lookup-service` which will impact config mounts. Also, take note of the [knexfile.js](https://github.com/mojaloop/helm/blob/master/account-lookup-service/chart-service/configs/knexfile.js#L2) defined in the Helm charts which have hard-coded directories which should also be changed to reflect this change.

### Features

* **mojaloop/#2092:** upgrade nodeJS version for core services ([#445](https://github.com/mojaloop/account-lookup-service/issues/445)) ([67d9a0e](https://github.com/mojaloop/account-lookup-service/commit/67d9a0eb72e5eb8365c73f9c98cb215755b54dbe)), closes [mojaloop/#2092](https://github.com/mojaloop/project/issues/2092)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([#443](https://github.com/mojaloop/account-lookup-service/issues/443)) ([812671e](https://github.com/mojaloop/account-lookup-service/commit/812671e56587ed1c6fdeebb0005ee78b2740421d))

## [13.0.0](https://github.com/mojaloop/account-lookup-service/compare/v12.1.0...v13.0.0) (2022-03-04)


### ⚠ BREAKING CHANGES

* **mojaloop/#2704:** - Config PROTOCOL_VERSIONS.CONTENT has now been modified to support backward compatibility for minor versions (i.e. v1.0 & 1.1) as follows:

> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": "1.1", <-- used when generating messages from the "SWITCH", and validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```
> 
> to be consistent with the ACCEPT structure as follows:
> 
> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": {
>       "DEFAULT": "1.1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>         "1.1",
>         "1.0"
>       ]
>     },
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```

### Features

* **mojaloop/#2704:** core-services support for non-breaking backward api compatibility ([#436](https://github.com/mojaloop/account-lookup-service/issues/436)) ([5900e52](https://github.com/mojaloop/account-lookup-service/commit/5900e52d48d511934fea222d093727e3fc02ffc3)), closes [mojaloop/#2704](https://github.com/mojaloop/project/issues/2704)


### Bug Fixes

* [#2704](https://github.com/mojaloop/account-lookup-service/issues/2704) core services support for non breaking backward api compatibility ([#438](https://github.com/mojaloop/account-lookup-service/issues/438)) ([273bd7d](https://github.com/mojaloop/account-lookup-service/commit/273bd7d0b1447d97114483370ee9e2fffccd9edf))


### Chore

* **deps:** bump follow-redirects from 1.14.5 to 1.14.7 ([#433](https://github.com/mojaloop/account-lookup-service/issues/433)) ([d7a715a](https://github.com/mojaloop/account-lookup-service/commit/d7a715a672da7345e7fc40708f71ad9d71d27abb))

## [12.1.0](https://github.com/mojaloop/account-lookup-service/compare/v12.0.0...v12.1.0) (2021-12-14)


### Features

* **mojaloop/#2608:** injected resource versions config for outbound requests ([#432](https://github.com/mojaloop/account-lookup-service/issues/432)) ([9df1d88](https://github.com/mojaloop/account-lookup-service/commit/9df1d88e3387fb4ddd6abfdfee40f45dbbd15ab5)), closes [mojaloop/#2608](https://github.com/mojaloop/project/issues/2608)

## [12.0.0](https://github.com/mojaloop/account-lookup-service/compare/v11.8.0...v12.0.0) (2021-11-05)


### ⚠ BREAKING CHANGES

* **mojaloop/#2534:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **mojaloop/#2534:** fspiop api version negotiation not handled by account lookup service ([#430](https://github.com/mojaloop/account-lookup-service/issues/430)) ([f1cf4a3](https://github.com/mojaloop/account-lookup-service/commit/f1cf4a3f2001d6c814ec5832aae9da83efce1ffa)), closes [mojaloop/#2534](https://github.com/mojaloop/project/issues/2534)

## [11.8.0](https://github.com/mojaloop/account-lookup-service/compare/v11.7.7...v11.8.0) (2021-09-28)


### Features

* **mojaloop/#2505:** als-subid-error-callback-endpoint-not-implemented ([#429](https://github.com/mojaloop/account-lookup-service/issues/429)) ([6051259](https://github.com/mojaloop/account-lookup-service/commit/605125925a5e181677fd357caf5605895b4b42a6)), closes [mojaloop/#2505](https://github.com/mojaloop/project/issues/2505)

### [11.7.7](https://github.com/mojaloop/account-lookup-service/compare/v11.7.6...v11.7.7) (2021-09-10)


### Bug Fixes

* **mojaloop/#2470:** central-services-shared streamingprotocol encode/decode functionality fix ([#428](https://github.com/mojaloop/account-lookup-service/issues/428)) ([2f5d26a](https://github.com/mojaloop/account-lookup-service/commit/2f5d26a094a329c20fa2b83d569a9e90f6474f89)), closes [mojaloop/#2470](https://github.com/mojaloop/project/issues/2470)

### [11.7.6](https://github.com/mojaloop/account-lookup-service/compare/v11.7.5...v11.7.6) (2021-09-09)


### Bug Fixes

* updated circleci config for slack env var typo fix ([#427](https://github.com/mojaloop/account-lookup-service/issues/427)) ([a9b03d2](https://github.com/mojaloop/account-lookup-service/commit/a9b03d2a02c04d4c7f2555b967d864c5fff49dfe))

### [11.7.5](https://github.com/mojaloop/account-lookup-service/compare/v11.7.4...v11.7.5) (2021-09-09)


### Chore

* expand unit tests for myanmar characters ([#426](https://github.com/mojaloop/account-lookup-service/issues/426)) ([d21176c](https://github.com/mojaloop/account-lookup-service/commit/d21176c452a2f17cdbcb0ef57706351fd2f98567)), closes [/github.com/mojaloop/project/issues/2358#issuecomment-916031483](https://github.com/mojaloop//github.com/mojaloop/project/issues/2358/issues/issuecomment-916031483)

### [11.7.4](https://github.com/mojaloop/account-lookup-service/compare/v11.7.3...v11.7.4) (2021-08-17)


### Bug Fixes

* **#2358-2:** firstname, middlename and lastname regex not supporting myanmar script unicode strings ([#425](https://github.com/mojaloop/account-lookup-service/issues/425)) ([7a61510](https://github.com/mojaloop/account-lookup-service/commit/7a61510be1a5fdcaf812d0ff059cedae112a4b79)), closes [#2358-2](https://github.com/mojaloop/account-lookup-service/issues/2358-2) [mojaloop/#2374](https://github.com/mojaloop/project/issues/2374)

### [11.7.3](https://github.com/mojaloop/account-lookup-service/compare/v11.7.2...v11.7.3) (2021-08-16)


### Bug Fixes

* **mojaloop/#2374:** ALS is sending out multiple requests to participants for both Oracle records that match non-subId and subId result set ([#424](https://github.com/mojaloop/account-lookup-service/issues/424)) ([3639ddc](https://github.com/mojaloop/account-lookup-service/commit/3639ddcc692abb0fbf835bfd879cf99bfa2556f3)), closes [mojaloop/#2374](https://github.com/mojaloop/project/issues/2374)

### [11.7.2](https://github.com/mojaloop/account-lookup-service/compare/v11.7.0...v11.7.2) (2021-08-11)


### Bug Fixes

* **#2358:** firstname, middlename and lastname regex not supporting myanmar script unicode strings ([#423](https://github.com/mojaloop/account-lookup-service/issues/423)) ([049ce8a](https://github.com/mojaloop/account-lookup-service/commit/049ce8ab296d9eb44825c9cd0f7e7b3bd69d279c)), closes [#2358](https://github.com/mojaloop/account-lookup-service/issues/2358) [#2358](https://github.com/mojaloop/account-lookup-service/issues/2358)

## [11.7.0](https://github.com/mojaloop/account-lookup-service/compare/v11.5.6...v11.7.0) (2021-07-22)


### Features

* da issue 79 ([#417](https://github.com/mojaloop/account-lookup-service/issues/417)) ([409bd68](https://github.com/mojaloop/account-lookup-service/commit/409bd68176728f560e6216ac9ff1dbf99d0db6cc))

### [11.5.6](https://github.com/mojaloop/account-lookup-service/compare/v11.5.5...v11.5.6) (2021-07-14)


### Documentation

* add overview of automated releases in readme ([#403](https://github.com/mojaloop/account-lookup-service/issues/403)) ([216b024](https://github.com/mojaloop/account-lookup-service/commit/216b0241cb8afe7b6eddc84f612127039445591a))

### [11.5.5](https://github.com/mojaloop/account-lookup-service/compare/v11.5.4...v11.5.5) (2021-07-14)

### [11.5.4](https://github.com/mojaloop/account-lookup-service/compare/v11.5.3...v11.5.4) (2021-07-14)


### Refactors

* change behaviour and validation of oracle CRUD ([#418](https://github.com/mojaloop/account-lookup-service/issues/418)) ([ef1e181](https://github.com/mojaloop/account-lookup-service/commit/ef1e1813d35bcff158e82a713a2e04ecd5e1baa5))

### [11.5.3](https://github.com/mojaloop/account-lookup-service/compare/v11.5.1...v11.5.3) (2021-06-11)


### Bug Fixes

* **mojaloop/project#2246:** updated dependency version ([#415](https://github.com/mojaloop/account-lookup-service/issues/415)) ([2c63093](https://github.com/mojaloop/account-lookup-service/commit/2c6309321c46744b8ae85d123cd5c65bca9bf70c)), closes [mojaloop/project#2246](https://github.com/mojaloop/project/issues/2246)

### [11.5.1](https://github.com/mojaloop/account-lookup-service/compare/v11.5.0...v11.5.1) (2021-06-02)


### Chore

* **2151:** helm-release-v12.1.0 ([#411](https://github.com/mojaloop/account-lookup-service/issues/411)) ([fb83b4e](https://github.com/mojaloop/account-lookup-service/commit/fb83b4e1d2bc9de63b58ec3a6f544c871ff13c63))

## [11.5.0](https://github.com/mojaloop/account-lookup-service/compare/v11.3.2...v11.5.0) (2021-06-01)


### Features

* **2151:** helm-release-v12.1.0 ([#408](https://github.com/mojaloop/account-lookup-service/issues/408)) ([f5b3270](https://github.com/mojaloop/account-lookup-service/commit/f5b32700ed981e1a2ad3e6ce25d365dafc0889b8))

### [11.3.2](https://github.com/mojaloop/account-lookup-service/compare/v11.3.1...v11.3.2) (2021-02-24)


### Chore

* fix hidden commit types not being included in changelog ([#402](https://github.com/mojaloop/account-lookup-service/issues/402)) ([81e626d](https://github.com/mojaloop/account-lookup-service/commit/81e626d8493a7f8b5a5687b7ffaea3ae34b8ef38))

### [11.3.1](https://github.com/mojaloop/account-lookup-service/compare/v11.3.0...v11.3.1) (2021-02-24)
