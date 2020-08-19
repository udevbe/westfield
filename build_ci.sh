#!/usr/bin/env bash

set -e

build () {
    local component
    local "${@}"

    printf "======[ BUILD $component STARTED ]======\n"
    pushd ${component}
    yarn install --frozen-lockfile
    popd
    printf "======[ BUILD $component DONE ]======\n"
}

printf "======[ STARTING BUILDS ]=====\n"
build component=client/generator
build component=client/runtime
build component=common
build component=server/web/runtime
build component=server/node/endpoint
build component=server/node/endpoint-generator
build component=server/node/endpoint-native
build component=server/node/runtime-generator
printf "======[ ALL BUILDS DONE ]======\n"

