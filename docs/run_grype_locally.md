# Running Grype Locally

Run the Grype vulnerability scan locally instead of waiting for CircleCI.

## Prerequisites

- **grype** - `brew install grype`
- **Docker** - only needed for full image scan mode

## Quick Start

```bash
# Full image scan - replicates exactly what CircleCI does
npm run grype:docker

# Base image only - no Docker daemon needed, fastest option
npm run grype:base-image

# Scan node_modules only - no Docker needed
npm run grype:dir
```

Or use the script directly:

```bash
./scripts/run-grype-local.sh                   # Full image scan
./scripts/run-grype-local.sh --base-image-only  # Base image only
./scripts/run-grype-local.sh --dir-only         # Directory scan
```

## Scan Modes

### Full image scan (`npm run grype:docker`)

Builds the Docker image via `npm run docker:build`, then scans it with `grype`. This replicates what CircleCI does and catches all vulnerability types: npm, apk, binary, and base-image npm packages.

### Base image only (`npm run grype:base-image`)

Scans the Node.js Alpine base image directly from Docker Hub registry. **No Docker daemon needed** - grype pulls the image manifest itself. This is the fastest way to check if new base image CVEs need to be added to `.grype.yaml`.

### Directory scan (`npm run grype:dir`)

Scans `node_modules` and `package-lock.json` for npm vulnerabilities only. Useful for quick checks without Docker.

## Vulnerability Categories

| Category | Source | Fix |
|----------|--------|-----|
| **npm** | App `node_modules` | `npm overrides` in package.json |
| **npm-base-image** | `/usr/local/lib/node_modules/` in image | Update Node.js version in Dockerfile |
| **apk** | Alpine packages (libcrypto3, libssl3) | Wait for Alpine patch, update base image |
| **binary** | Node.js binary | Update Node.js version in Dockerfile |

## When Grype Fails

1. **New npm vulnerability** - Add an override to `package.json`, run `npm install`
2. **New base image CVE** - Update `NODE_VERSION` in Dockerfile, or add to `.grype.yaml` if no fix exists
3. **Unfixable CVE** - Add to `.grype.yaml`:
   ```yaml
   ignore:
     - vulnerability: CVE-YYYY-XXXXX
       include-aliases: true
       reason: "Description of why this can't be fixed as of YYYY-MM-DD"
   ```
