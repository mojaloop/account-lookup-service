# Casablanca central directory

Swagger api [location](./src/config/swagger.json)

# Database initialisation container/service
Build the central-ledger-init container from the central-ledger-init repo. Note
that the central-directory-init container inherits initialise.sh from that
container. Then, from this repo root, run:
```bash
docker build -t central-directory-init:latest -f ./Dockerfile.dbinit ./
```

# Updating dependencies

```bash
cd src/
npm run-script package-lock
```

# Testing

Follow the README instructions to run the mysql container from the central-ledger-init repo, then
build and run the central-ledger-init container. Then, from this repo root, run:
```bash
docker build -t central-directory-testinit:latest -f ./Dockerfile.testdbinit ./
docker run --rm --link db:db -e CLEDG_DATABASE_URI='mysql://casa:casa@db:3306/central_ledger' central-directory-testinit:latest
```

Now you're ready to run the central directory service as follows:
```bash
cd src/
npm run-script build
npm run-script run
curl localhost:3000
```

# Some useful tricks
## Get an address that both you and your containers can bind to:
```bash
ip a # or ifconfig on older machines
```
Now look for the `docker0` (or similarly named) interface and find its
associated IP address

## Set up a local listen-server:
```bash
export ADDR=172.17.0.1 # you probably want this to be the address for your docker interface
while true; do echo -e "HTTP/1.1 200 OK\n\n $(date)" | nc -l $ADDR 2999; done
```
