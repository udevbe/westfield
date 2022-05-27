cmake_minimum_required(VERSION 3.13)

project(westfield C)
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED TRUE)

set(CMAKE_BUILD_TYPE "Debug")
#set(CMAKE_BUILD_TYPE "Release")

#find_package(OpenGL REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(LibFFI REQUIRED libffi IMPORTED_TARGET)
pkg_check_modules(LIBUDEV REQUIRED libudev IMPORTED_TARGET)
pkg_check_modules(GBM REQUIRED gbm IMPORTED_TARGET)
pkg_check_modules(EGL REQUIRED egl IMPORTED_TARGET)

add_library(westfield-wayland-server SHARED
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server-protocol.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-protocol.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/westfield-wayland-server-extra.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/connection.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/event-loop.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-os.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-os.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-private.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server-private.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server-core.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-shm.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-util.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-util.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/westfield-wayland-server.h
)
target_include_directories(westfield-wayland-server PRIVATE
        ${LibFFI_INCLUDE_DIRS}
)
target_link_libraries(westfield-wayland-server PRIVATE
        PkgConfig::LibFFI
        -Wl,--no-undefined
)
set_target_properties(westfield-wayland-server
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist
)
file(GLOB WESTFIELD_WAYLAND_SERVER_PUBLIC_HEADERS
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-server-core.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-util.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/wayland-version.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/westfield-wayland-server-extra.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server/westfield-wayland-server.h
)
file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/include/wayland-server)
file(COPY ${WESTFIELD_WAYLAND_SERVER_PUBLIC_HEADERS} DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/dist/include/wayland-server)


add_library(westfield SHARED
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-fdutils.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-fdutils.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-xwayland.h
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-xwayland.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-drm.c
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/westfield-drm.h native/src/westfield.h
)
target_include_directories(westfield PRIVATE
        ${CMAKE_SOURCE_DIR}/native/src/wayland-server
        ${CMAKE_SOURCE_DIR}/native/src/wayland-server/protocol
        ${LIBUDEV_INCLUDE_DIRS}
        ${GBM_INCLUDE_DIRS}
        ${EGL_INCLUDE_DIRS}
)
target_link_libraries(westfield PRIVATE
        westfield-wayland-server
        ${CMAKE_JS_LIB}
        PkgConfig::LIBUDEV
        PkgConfig::GBM
        PkgConfig::EGL
        -Wl,--no-undefined
)
set_target_properties(westfield
    PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist
)
file(GLOB WESTFIELD_PUBLIC_HEADERS
        ${CMAKE_SOURCE_DIR}/native/src/*.h
)
file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/include)
file(COPY ${WESTFIELD_PUBLIC_HEADERS} DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/dist/include)


add_library(westfield-addon SHARED
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/node-addon/westfield-addon.c
)
target_include_directories(westfield-addon PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-api-headers/include
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src/wayland-server
        ${CMAKE_CURRENT_SOURCE_DIR}/native/src
)
set_target_properties(westfield-addon
        PROPERTIES PREFIX "" SUFFIX ".node"
)
target_link_libraries(westfield-addon PRIVATE
            ${CMAKE_JS_LIB}
            westfield-wayland-server
            westfield
)
set_target_properties(westfield-addon
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist
)