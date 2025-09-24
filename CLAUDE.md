# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Service
- `npm start` - Start both API and Admin servers
- `npm run start:api` - Start only the API server (port 3000)
- `npm run start:admin` - Start only the Admin server (port 3001)
- `npm run start:handlers` - Start message handlers with timeout
- `npm run dev` - Start in development mode with nodemon

### Testing
- `npm test` or `npm run test:unit` - Run unit tests with Jest
- `npm run test:coverage-check` - Run tests with coverage validation (90% threshold)
- `npm run test:int` - Run integration tests (requires database)
- `npm run test:integration` - Full integration test suite with Docker containers
- `npm run test:functional` - Run functional tests

### Database Operations
- `npm run migrate` - Run database migrations and seed data (requires database connection)
- `npm run migrate:latest` - Run latest migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed:run` - Run database seeds

### Code Quality
- `npm run lint` - Run StandardJS linting
- `npm run lint:fix` - Auto-fix linting issues
- `npm run audit:check` - Check for security vulnerabilities
- `npm run dep:check` - Check for dependency updates

### Docker Development
- `npm run dc:up` - Start all services with Docker Compose
- `npm run dc:down` - Stop and remove containers
- `npm run wait-4-docker` - Wait for Docker services to be ready

## Architecture Overview

### Service Structure
This is a **Mojaloop Account Lookup Service** built with **Hapi.js** and **MySQL**. The service provides two main servers:

- **API Server** (`src/server.js:initializeApi`) - Handles party lookup requests and participant queries
- **Admin Server** (`src/server.js:initializeAdmin`) - Provides administrative endpoints and health checks
- **Message Handlers** (`src/handlers/`) - Processes asynchronous messages for timeout handling

### Key Components

#### Domain Layer (`src/domain/`)
- **parties/** - Core party lookup logic and validation
- **participants/** - Participant management operations  
- **oracle/** - Oracle endpoint resolution
- **timeout/** - Message timeout handling

#### API Layer (`src/api/`)
- Uses **OpenAPI 3.0** specifications for endpoint definitions
- Swagger files: `src/interface/api-swagger.yaml` and `src/interface/admin-swagger.yaml`
- Route handlers split between API and Admin functionality

#### Data Access (`src/models/`)
- **Knex.js** for database operations and migrations
- MySQL database with connection pooling
- Cached oracle endpoints for performance

#### Caching Strategy
The service uses multiple cache layers:
- **ParticipantEndpointCache** - Caches participant endpoints from central ledger
- **ParticipantCache** - Caches participant information
- **OracleEndpointCache** - Caches oracle endpoint mappings
- **ProxyCache** - For inter-scheme proxy operations (Redis/Memory)

### Configuration
- Main config: `src/lib/config/default.json`
- Environment-specific configs in `config/` directory
- Database config: `config/knexfile.js` 
- Docker: `docker-compose.yml` for full service stack

### Testing Strategy
- **Unit Tests**: Jest with 90% coverage requirement (`jest.config.js`)
- **Integration Tests**: Docker-based with real database (`jest-int.config.js`)
- **Functional Tests**: End-to-end API testing
- Test setup: `test/unit/setup.js`

### Key Dependencies
- **@hapi/hapi** - Web framework
- **@mojaloop/central-services-*** - Mojaloop shared libraries for logging, metrics, caching
- **knex** + **mysql2** - Database ORM and driver
- **joi** - Request/response validation
- **commander** - CLI interface

### Database Schema
Uses Knex migrations in `migrations/` directory. Key tables include participant and oracle endpoint mappings. Always run `npm run migrate` before development.

## Development Notes

- Use `standard` for code formatting (no semicolons, 2-space indentation)
- All database operations should go through the domain layer
- OpenAPI specs are the source of truth for API contracts
- Integration tests require Docker and can be run in "wait" mode for debugging
- The service supports ISO20022 message formats alongside FSPIOP