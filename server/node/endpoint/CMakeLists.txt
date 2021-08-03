cmake_minimum_required(VERSION 3.7)

project(westfield-native C)
#set(CMAKE_BUILD_TYPE "Debug")

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/modules")

find_package(LibFFI REQUIRED)

add_library(${PROJECT_NAME} SHARED
        native/src/string-helpers.h
        native/src/wayland-server/protocol/wayland-server-protocol.h
        native/src/wayland-server/protocol/wayland-protocol.c
        native/src/westfield-native.c
        native/src/connection.h
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
        native/src/wayland-server/wayland-util.c
        native/src/westfield-fdutils.c
        native/src/westfield-fdutils.h
        native/src/wayland-server-core-extensions.h
        native/src/westfield-xwayland.h
        native/src/westfield-xwayland.c)

target_include_directories(${PROJECT_NAME}
        PRIVATE ${CMAKE_JS_INC}
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server/protocol"
        )

set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} ${LIBFFI_LIBRARIES})
set_target_properties(${PROJECT_NAME}
    PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../src
)
