#!/usr/bin/env bash

set -e

build () {
    local component
    local "${@}"

    printf "======[ BUILD $component STARTED ]======\n"
    pushd ${component}
    npm ci
    popd
    printf "======[ BUILD $component DONE ]======\n"
}

printf "======[ STARTING BUILDS ]=====\n"
build component=server/node/runtime
build component=server/node/generator
build component=server/node/endpoint
build component=server/node/endpoint-native
build component=server/node/endpoint-generator
printf "======[ ALL BUILDS DONE ]======\n"

