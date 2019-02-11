
# Version our container with the current commit hash
# If our tree isn't clean we'll append "-local" to the version
# Untracked files are ignored when considering whether the tree is clean
REV:=$(shell git rev-parse HEAD)
# It's possible to add --show-untracked=no to the git status command to ignore untracked files
VER:=${REV}$(shell if [[ `git status --porcelain` ]]; then echo "-local"; fi)
REPO:=casablanca-casa-docker-release.jfrog.io
NAME:=casablanca-central-directory
TAG:=${REPO}/${NAME}:${VER}
INIT_NAME:=casablanca-central-directory-init
INIT_TAG:=${REPO}/${INIT_NAME}:${VER}
REPO_ROOT:=$(shell git rev-parse --show-toplevel)

## NORMAL BUILDS
# Containing any local modifications or untracked files, if present. If none are present, will
# produce a clean build.

all: build

build:
	docker build --pull=true -t ${TAG} ./

build_init:
	docker build --pull=true -t ${INIT_TAG} -f ./Dockerfile.dbinit ./

build_all: build build_init

push: build
	docker push ${TAG}

push_init: build_init
	docker push ${INIT_TAG}

push_all: push push_init


## CLEAN BUILDS
# Create a build from the current repo HEAD, without modifications or untracked files

build_clean: create_clean_temp_repo
	docker build --pull=true -t ${REPO}/${NAME}:${REV} ${CLEAN_BUILD_DIR}

build_clean_init: create_clean_temp_repo
	docker build --pull=true -t ${REPO}/${INIT_NAME}:${REV} -f ./Dockerfile.dbinit ${CLEAN_BUILD_DIR}

build_clean_all: build_clean build_clean_init

push_clean: build_clean
	docker push ${REPO}/${NAME}:${REV}

push_clean_init: build_clean_init
	docker push ${REPO}/${INIT_NAME}:${REV}

push_clean_all: push_clean push_clean_init

# Copy the repo to a temp directory, hard reset to HEAD, remove all untracked files in the repo and
# any submodules.
#
# Note that we eval CLEAN_BUILD_DIR on the first line so that it's not created for every rule and
# cluttering up our /tmp dir (which, although relatively benign, could be pretty annoying in some
# circumstances). Further note that CLEAN_BUILD_DIR has "file-level" scope, not target-level scope.
#
# Further note that both build_clean_init and build_clean depend on this rule, and that
# build_clean_all depends on both build_clean and build_clean_init. In other words, there is a
# diamond dependency tree. When build_clean_all is run, create_clean_temp_repo will only be run
# once.
create_clean_temp_repo:
	$(eval CLEAN_BUILD_DIR:=$(shell mktemp -d))
	cp -a ${REPO_ROOT}/. ${CLEAN_BUILD_DIR}
	git -C ${CLEAN_BUILD_DIR} clean -xdff
	git -C ${CLEAN_BUILD_DIR} reset --hard
