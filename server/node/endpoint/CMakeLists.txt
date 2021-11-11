cmake_minimum_required(VERSION 3.15)

project(westfield-native C)
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED TRUE)
#set(CMAKE_BUILD_TYPE "Debug")

execute_process(COMMAND node -p "require('node-api-headers').include_dir"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_API_DIR
        )
string(REGEX REPLACE "[\r\n\"]" "" NODE_API_DIR ${NODE_API_DIR})

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/modules")
find_package(LibFFI REQUIRED)

add_library(westfield-wayland-server SHARED
        native/src/wayland-server/protocol/wayland-server-protocol.h
        native/src/wayland-server/protocol/wayland-protocol.c
        native/src/wayland-server/westfield-extra.h
        native/src/wayland-server/connection.c
        native/src/wayland-server/event-loop.c
        native/src/wayland-server/wayland-os.h
        native/src/wayland-server/wayland-os.c
        native/src/wayland-server/wayland-private.h
        native/src/wayland-server/wayland-server.h
        native/src/wayland-server/wayland-server.c
        native/src/wayland-server/wayland-server-core.h
        native/src/wayland-server/wayland-shm.c
        native/src/wayland-server/wayland-util.h
        native/src/wayland-server/wayland-util.c)
target_link_libraries(westfield-wayland-server ${CMAKE_JS_LIB} ${LIBFFI_LIBRARIES})
set_target_properties(westfield-wayland-server
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../src
        )

add_library(${PROJECT_NAME} SHARED
        native/src/string-helpers.h
        native/src/westfield-native.c
        native/src/westfield-fdutils.c
        native/src/westfield-fdutils.h
        native/src/westfield-xwayland.h
        native/src/westfield-xwayland.c)

target_include_directories(${PROJECT_NAME}
        PRIVATE ${NODE_API_DIR}
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server/protocol"
        )

set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} westfield-wayland-server ${CMAKE_JS_LIB} ${LIBFFI_LIBRARIES})
set_target_properties(${PROJECT_NAME}
    PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../src
)
