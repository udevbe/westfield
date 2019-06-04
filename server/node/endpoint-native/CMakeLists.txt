cmake_minimum_required(VERSION 3.7)

project(westfield-native C)
#set(CMAKE_BUILD_TYPE "Debug")

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/modules")

find_package(LibFFI REQUIRED)

add_library(${PROJECT_NAME} SHARED
        src/wayland-server/protocol/wayland-server-protocol.h
        src/wayland-server/protocol/wayland-protocol.c
        src/westfield-native.c
        src/connection.h
        src/wayland-server/connection.c
        src/wayland-server/event-loop.c
        src/wayland-server/wayland-os.h
        src/wayland-server/wayland-os.c
        src/wayland-server/wayland-private.h
        src/wayland-server/wayland-server.h
        src/wayland-server/wayland-server.c
        src/wayland-server/wayland-server-core.h
        src/wayland-server/wayland-shm.c
        src/wayland-server/wayland-util.h
        src/wayland-server/wayland-util.c
        src/westfield-fdutils.c
        src/westfield-fdutils.h
        src/wayland-server-core-extensions.h)

target_include_directories(${PROJECT_NAME}
    PRIVATE ${CMAKE_JS_INC}
    PRIVATE "${CMAKE_SOURCE_DIR}/src/wayland-server"
    PRIVATE "${CMAKE_SOURCE_DIR}/src/wayland-server/protocol"
    )

set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} ${LIBFFI_LIBRARIES})