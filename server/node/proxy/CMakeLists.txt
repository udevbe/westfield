cmake_minimum_required(VERSION 3.13)

project(westfield C)
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED TRUE)
#set(CMAKE_BUILD_TYPE "Debug")
set(CMAKE_BUILD_TYPE "Release")

set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/modules")
find_package(LibFFI REQUIRED)
find_package(OpenGL REQUIRED)


add_library(wayland-server SHARED
        native/src/wayland-server/wayland-server-protocol.h
        native/src/wayland-server/wayland-protocol.c
        native/src/wayland-server/westfield-wayland-server-extra.h
        native/src/wayland-server/connection.c
        native/src/wayland-server/event-loop.c
        native/src/wayland-server/wayland-os.h
        native/src/wayland-server/wayland-os.c
        native/src/wayland-server/wayland-private.h
        native/src/wayland-server/wayland-server.h
        native/src/wayland-server/wayland-server.c
        native/src/wayland-server/wayland-server-private.h
        native/src/wayland-server/wayland-server-core.h
        native/src/wayland-server/wayland-shm.c
        native/src/wayland-server/wayland-util.h
        native/src/wayland-server/wayland-util.c)
target_link_libraries(wayland-server ${LIBFFI_LIBRARIES})
set_target_properties(wayland-server
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../dist
        )
file(GLOB WESTFIELD_WAYLAND_SERVER_PUBLIC_HEADERS
        "${CMAKE_SOURCE_DIR}/native/src/wayland-server/wayland-server-core.h"
        "${CMAKE_SOURCE_DIR}/native/src/wayland-server/westfield-wayland-server-extra.h"
        )
file(MAKE_DIRECTORY ../dist/include)
file(COPY ${WESTFIELD_WAYLAND_SERVER_PUBLIC_HEADERS} DESTINATION ../dist/include)


add_library(westfield SHARED
        native/src/westfield-fdutils.c
        native/src/westfield-fdutils.h
        native/src/westfield-xwayland.h
        native/src/westfield-xwayland.c
        native/src/westfield-drm.c
        native/src/westfield-drm.h native/src/westfield.h)
target_include_directories(westfield
        PRIVATE "${OPENGL_EGL_INCLUDE_DIRS}"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server/protocol"
        )
target_link_libraries(westfield
        wayland-server ${CMAKE_JS_LIB} ${LIBFFI_LIBRARIES} OpenGL::EGL)
set_target_properties(westfield
    PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../dist
)
file(GLOB WESTFIELD_PUBLIC_HEADERS
        "${CMAKE_SOURCE_DIR}/native/src/*.h"
)
file(MAKE_DIRECTORY ../dist/include)
file(COPY ${WESTFIELD_PUBLIC_HEADERS} DESTINATION ../dist/include)


add_library(westfield-addon SHARED
        native/src/node-addon/westfield-addon.c)
target_include_directories(westfield-addon
        PRIVATE "${CMAKE_SOURCE_DIR}/node_modules/node-api-headers/include"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src/wayland-server"
        PRIVATE "${CMAKE_SOURCE_DIR}/native/src"
        )
set_target_properties(westfield-addon
        PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(westfield-addon
            ${CMAKE_JS_LIB}
            wayland-server
            westfield
        )
set_target_properties(westfield-addon
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ../dist
        )