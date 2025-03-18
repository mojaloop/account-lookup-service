# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [17.5.0](https://github.com/mojaloop/account-lookup-service/compare/v17.4.1...v17.5.0) (2025-03-18)


### Features

* rethrow with context ([#540](https://github.com/mojaloop/account-lookup-service/issues/540)) ([c1037e9](https://github.com/mojaloop/account-lookup-service/commit/c1037e9ee3d78224074ca2c7ecc24c68a81c7e9e))

### [17.4.1](https://github.com/mojaloop/account-lookup-service/compare/v17.3.2...v17.4.1) (2025-03-14)


### Chore

* **csi-1300:** refactor get/put parties code to add new functionality easier ([#535](https://github.com/mojaloop/account-lookup-service/issues/535)) ([80a17df](https://github.com/mojaloop/account-lookup-service/commit/80a17df55419368e36a2c8acc3c4a5d1059c30f0))
* remove proxy map onboarding ([#538](https://github.com/mojaloop/account-lookup-service/issues/538)) ([560b42d](https://github.com/mojaloop/account-lookup-service/commit/560b42d37a266f635609d18e04aa7ea99688cebd))

### [17.3.2](https://github.com/mojaloop/account-lookup-service/compare/v17.3.1...v17.3.2) (2025-03-13)


### Chore

* bump up ([#536](https://github.com/mojaloop/account-lookup-service/issues/536)) ([dc04445](https://github.com/mojaloop/account-lookup-service/commit/dc044459e512906bcc582fbcbe30b592c0de78cb))

### [17.3.1](https://github.com/mojaloop/account-lookup-service/compare/v17.3.0...v17.3.1) (2025-03-07)


### Chore

* update-event-sdk ([#530](https://github.com/mojaloop/account-lookup-service/issues/530)) ([1deb7ed](https://github.com/mojaloop/account-lookup-service/commit/1deb7ed63d7b26ca3244f085c88ffe8f65724c28))

## [17.3.0](https://github.com/mojaloop/account-lookup-service/compare/v17.2.1...v17.3.0) (2025-03-06)


### Features

* **csi-1252:** updated central-services-shared to log error details ([#528](https://github.com/mojaloop/account-lookup-service/issues/528)) ([24df31d](https://github.com/mojaloop/account-lookup-service/commit/24df31d89889bb84973f77f0348d583d71199653))

### [17.2.1](https://github.com/mojaloop/account-lookup-service/compare/v17.2.0...v17.2.1) (2025-03-05)


### Bug Fixes

* **csi-1247:** added logs and process.on('uncaughtException') ([#527](https://github.com/mojaloop/account-lookup-service/issues/527)) ([c4b5e7d](https://github.com/mojaloop/account-lookup-service/commit/c4b5e7d834a76f78114863555f115a872eb2da0f))

## [17.2.0](https://github.com/mojaloop/account-lookup-service/compare/v17.1.0...v17.2.0) (2025-02-26)


### Features

* update count metrics, fix int, update oracle code null currency ([#526](https://github.com/mojaloop/account-lookup-service/issues/526)) ([62167a5](https://github.com/mojaloop/account-lookup-service/commit/62167a5357b800af93bc0c4d950c0efbc6850a82))

## [17.1.0](https://github.com/mojaloop/account-lookup-service/compare/v17.0.3...v17.1.0) (2025-02-20)


### Features

* refactor audits ([#524](https://github.com/mojaloop/account-lookup-service/issues/524)) ([b02d396](https://github.com/mojaloop/account-lookup-service/commit/b02d396dd914c00bb3f0db7f046c5978a0d522b4))


### Bug Fixes

* add consent oracle and update license ([#525](https://github.com/mojaloop/account-lookup-service/issues/525)) ([18128dc](https://github.com/mojaloop/account-lookup-service/commit/18128dc8586fcb384b5505ab6ab7383c53a95488))


### Chore

* update build orb to version 1.0.50 and add context to workflow ([#523](https://github.com/mojaloop/account-lookup-service/issues/523)) ([868c9b3](https://github.com/mojaloop/account-lookup-service/commit/868c9b32a3ca222a7cb46b1ed4fdd8bff839cd89))

### [17.0.3](https://github.com/mojaloop/account-lookup-service/compare/v17.0.2...v17.0.3) (2025-01-28)


### Chore

* fix vulnerabilities and update deps ([#522](https://github.com/mojaloop/account-lookup-service/issues/522)) ([dd65c94](https://github.com/mojaloop/account-lookup-service/commit/dd65c94999319bfeca460838a889b2866654df3c))

### [17.0.2](https://github.com/mojaloop/account-lookup-service/compare/v17.0.1...v17.0.2) (2025-01-27)


### Chore

* maintenance updates ([#520](https://github.com/mojaloop/account-lookup-service/issues/520)) ([2e91f4a](https://github.com/mojaloop/account-lookup-service/commit/2e91f4a21239158c9f4a4bb72f0eb09206f4e292))

### [17.0.1](https://github.com/mojaloop/account-lookup-service/compare/v17.0.0...v17.0.1) (2025-01-20)


### Chore

* address follow up iso comments ([#519](https://github.com/mojaloop/account-lookup-service/issues/519)) ([f1fe64f](https://github.com/mojaloop/account-lookup-service/commit/f1fe64f9764b9febbb449249a8daa59e22310d37))

## [17.0.0](https://github.com/mojaloop/account-lookup-service/compare/v16.0.2...v17.0.0) (2025-01-19)


### ⚠ BREAKING CHANGES

* add iso20022 compatibility (#518)

### Features

* add iso20022 compatibility ([#518](https://github.com/mojaloop/account-lookup-service/issues/518)) ([1eaaff1](https://github.com/mojaloop/account-lookup-service/commit/1eaaff13048af5bc34cd55fcd85b2152e6413963)), closes [#482](https://github.com/mojaloop/account-lookup-service/issues/482) [#483](https://github.com/mojaloop/account-lookup-service/issues/483)

### [16.0.2](https://github.com/mojaloop/account-lookup-service/compare/v16.0.1...v16.0.2) (2025-01-07)


### Chore

* dependency updates pi26 ([#516](https://github.com/mojaloop/account-lookup-service/issues/516)) ([08ef522](https://github.com/mojaloop/account-lookup-service/commit/08ef5226aacf5e7c0967f6912be9eec8480eecd8))

### [16.0.1](https://github.com/mojaloop/account-lookup-service/compare/v16.0.0...v16.0.1) (2024-12-20)


### Chore

* dependency and vulnerability updates pi26 ([#513](https://github.com/mojaloop/account-lookup-service/issues/513)) ([46d245a](https://github.com/mojaloop/account-lookup-service/commit/46d245ae04e6305408845ccd32d6abc07be6a5a8))

## [16.0.0](https://github.com/mojaloop/account-lookup-service/compare/v15.3.4...v16.0.0) (2024-12-11)


### ⚠ BREAKING CHANGES

* fx and interscheme implementation (#492)

### Features

* fx and interscheme implementation ([#492](https://github.com/mojaloop/account-lookup-service/issues/492)) ([c44e5e0](https://github.com/mojaloop/account-lookup-service/commit/c44e5e019fb3092b789cfb07d37dbe087142a37d)), closes [#482](https://github.com/mojaloop/account-lookup-service/issues/482) [#483](https://github.com/mojaloop/account-lookup-service/issues/483)

### [15.3.4](https://github.com/mojaloop/account-lookup-service/compare/v15.3.3...v15.3.4) (2024-06-11)


### Chore

* updates regarding markdown it, overrides ([#481](https://github.com/mojaloop/account-lookup-service/issues/481)) ([ea645e8](https://github.com/mojaloop/account-lookup-service/commit/ea645e807d3c36df1f59c343403b496e66734399))

### [15.3.3](https://github.com/mojaloop/account-lookup-service/compare/v15.3.2...v15.3.3) (2024-06-11)


### Chore

* update cs shared ([#480](https://github.com/mojaloop/account-lookup-service/issues/480)) ([8c12569](https://github.com/mojaloop/account-lookup-service/commit/8c12569e448003b991366f18d9cc72a166d0af69))

### [15.3.2](https://github.com/mojaloop/account-lookup-service/compare/v15.3.1...v15.3.2) (2024-06-11)


### Chore

* dependency updates and minor maintenance changes ([#478](https://github.com/mojaloop/account-lookup-service/issues/478)) ([9227508](https://github.com/mojaloop/account-lookup-service/commit/92275083355e1f058914a617d2cd49cfb29eb9be))

### [15.3.1](https://github.com/mojaloop/account-lookup-service/compare/v15.3.0...v15.3.1) (2024-06-07)


### Bug Fixes

* image scan error ([#477](https://github.com/mojaloop/account-lookup-service/issues/477)) ([395c3ba](https://github.com/mojaloop/account-lookup-service/commit/395c3bae79a729422b8fc75d85656231338bcdf6))

## [15.3.0](https://github.com/mojaloop/account-lookup-service/compare/v15.2.5...v15.3.0) (2024-05-28)


### Features

* enable sending events directly to Kafka ([#476](https://github.com/mojaloop/account-lookup-service/issues/476)) ([a2ad614](https://github.com/mojaloop/account-lookup-service/commit/a2ad61451be300304f050ceb9946774385fc2e23))

### [15.2.5](https://github.com/mojaloop/account-lookup-service/compare/v15.2.4...v15.2.5) (2024-05-17)


### Bug Fixes

* stack overflow ([#475](https://github.com/mojaloop/account-lookup-service/issues/475)) ([a6a3b5d](https://github.com/mojaloop/account-lookup-service/commit/a6a3b5da22d271279985bd0d590fa68787c2f409))

### [15.2.4](https://github.com/mojaloop/account-lookup-service/compare/v15.2.3...v15.2.4) (2024-04-23)


### Bug Fixes

* excessive span logging ([#474](https://github.com/mojaloop/account-lookup-service/issues/474)) ([c51b7de](https://github.com/mojaloop/account-lookup-service/commit/c51b7de89d9b5856a4bd6f4c18f4848656725606))
* **mojaloop#/3829:** added jwsSigner defining to PUT /participants callback ([#472](https://github.com/mojaloop/account-lookup-service/issues/472)) ([92908a4](https://github.com/mojaloop/account-lookup-service/commit/92908a417e776e866ec96c0ca8016a7a86c7880a))

### [15.2.3](https://github.com/mojaloop/account-lookup-service/compare/v15.2.2...v15.2.3) (2024-03-07)


### Chore

* **mojaloop/#3759:** update central shared ([#470](https://github.com/mojaloop/account-lookup-service/issues/470)) ([3f6b233](https://github.com/mojaloop/account-lookup-service/commit/3f6b233420ebb6d78d88fdc81c27ff2c12caeeb2)), closes [mojaloop/#3759](https://github.com/mojaloop/project/issues/3759)

### [15.2.2](https://github.com/mojaloop/account-lookup-service/compare/v15.2.1...v15.2.2) (2024-03-01)


### Chore

* **mojaloop/#3759:** fix incorrect error description ([#469](https://github.com/mojaloop/account-lookup-service/issues/469)) ([3fba290](https://github.com/mojaloop/account-lookup-service/commit/3fba290328d6d0c9ab89e794cd840241a16d872e))

### [15.2.1](https://github.com/mojaloop/account-lookup-service/compare/v15.2.0...v15.2.1) (2023-12-20)


### Bug Fixes

* **mojaloop/#3682:** fix cache implementation ([#468](https://github.com/mojaloop/account-lookup-service/issues/468)) ([b2458d9](https://github.com/mojaloop/account-lookup-service/commit/b2458d9afa00e7e47ae38670286d0d0314454330))

## [15.2.0](https://github.com/mojaloop/account-lookup-service/compare/v15.1.0...v15.2.0) (2023-11-28)


### Features

* **mojaloop/#3427:** add oracle endpoint db caching and oracle request caching ([#467](https://github.com/mojaloop/account-lookup-service/issues/467)) ([42e93d0](https://github.com/mojaloop/account-lookup-service/commit/42e93d013427c69b93ad1b096bb480630528a047)), closes [mojaloop/#3427](https://github.com/mojaloop/project/issues/3427)

## [15.1.0](https://github.com/mojaloop/account-lookup-service/compare/v15.0.0...v15.1.0) (2023-11-24)


### Features

* **mojaloop/#3426:** add participant req caching, enable cache metrics, log fixes ([#465](https://github.com/mojaloop/account-lookup-service/issues/465)) ([803d671](https://github.com/mojaloop/account-lookup-service/commit/803d671f77acd97b224d0f7debed1e2edc5b10d5))

## [15.0.0](https://github.com/mojaloop/account-lookup-service/compare/v14.2.5...v15.0.0) (2023-11-07)


### Bug Fixes

* **mojaloop/#3615:** update dependencies ([#464](https://github.com/mojaloop/account-lookup-service/issues/464)) ([f6a544c](https://github.com/mojaloop/account-lookup-service/commit/f6a544ce07b6d72cdabd93208bb51e38afa28faa)), closes [mojaloop/#3615](https://github.com/mojaloop/project/issues/3615)

### [14.2.5](https://github.com/mojaloop/account-lookup-service/compare/v14.2.3...v14.2.5) (2023-09-12)


### Chore

* **mojaloop/#3435:** nodejs upgrade ([#462](https://github.com/mojaloop/account-lookup-service/issues/462)) ([cea1fae](https://github.com/mojaloop/account-lookup-service/commit/cea1fae3fc32043e381b9dbcfc8642bf5387ce67)), closes [mojaloop/#3435](https://github.com/mojaloop/project/issues/3435)

### [14.2.3](https://github.com/mojaloop/account-lookup-service/compare/v14.2.2...v14.2.3) (2023-07-27)


### Bug Fixes

* json stringify on every response ([#460](https://github.com/mojaloop/account-lookup-service/issues/460)) ([2525b6c](https://github.com/mojaloop/account-lookup-service/commit/2525b6ccbc866d05697f73cd224a5a6fdc35ef2f))

### [14.2.2](https://github.com/mojaloop/account-lookup-service/compare/v14.2.1...v14.2.2) (2023-07-12)


### Chore

* update default.json ([#459](https://github.com/mojaloop/account-lookup-service/issues/459)) ([527d5ee](https://github.com/mojaloop/account-lookup-service/commit/527d5ee118ea2fb347327491486f82b456a4cc7d))

### [14.2.1](https://github.com/mojaloop/account-lookup-service/compare/v14.2.0...v14.2.1) (2023-07-12)


### Bug Fixes

* added missing metrics initialisation ([#458](https://github.com/mojaloop/account-lookup-service/issues/458)) ([fd0d87b](https://github.com/mojaloop/account-lookup-service/commit/fd0d87ba52862b2e901ea1a52310f5f1d23a377f))

## [14.2.0](https://github.com/mojaloop/account-lookup-service/compare/v14.1.0...v14.2.0) (2023-07-11)


### Features

* **mojaloop/#3396:** added missing metrics ([#457](https://github.com/mojaloop/account-lookup-service/issues/457)) ([eb82101](https://github.com/mojaloop/account-lookup-service/commit/eb821018c05e03a9ca72ee1be14ecb88a93b1f7a)), closes [mojaloop/#3396](https://github.com/mojaloop/project/issues/3396)

## [14.1.0](https://github.com/mojaloop/account-lookup-service/compare/v14.0.0...v14.1.0) (2022-11-25)


### Features

* **mojaloop/#2740:** add testing currency codes and update codeowners ([#450](https://github.com/mojaloop/account-lookup-service/issues/450)) ([7cec9f2](https://github.com/mojaloop/account-lookup-service/commit/7cec9f2633dd29e8b7854fd5a5846ebdc70e764d)), closes [mojaloop/#2740](https://github.com/mojaloop/project/issues/2740)

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
