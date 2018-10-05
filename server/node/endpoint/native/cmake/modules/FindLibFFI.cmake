#
# FindLibFFI.
#
# - Try to find libelf
# Once done this will define
#
#  LIBFFI_FOUND - system has libffi
#  LIBFFI_INCLUDE_DIRS - the libffi include directory
#  LIBFFI_LIBRARIES - Link these to use libffi
#
#   Copyright (c) 2010-2015  Takashi Kato <ktakashi@ymail.com>
#
#   Redistribution and use in source and binary forms, with or without
#   modification, are permitted provided that the following conditions
#   are met:
#
#   1. Redistributions of source code must retain the above copyright
#      notice, this list of conditions and the following disclaimer.
#
#   2. Redistributions in binary form must reproduce the above copyright
#      notice, this list of conditions and the following disclaimer in the
#      documentation and/or other materials provided with the distribution.
#
#   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
#   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
#   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
#   A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
#   OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
#   SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
#   TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
#   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
#   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
#   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
#   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#

# CMake module to find libffi
# use pkg-config if available
FIND_PACKAGE(PkgConfig)
PKG_CHECK_MODULES(PC_LIBFFI QUIET libffi)

FIND_PATH(LIBFFI_INCLUDE_DIR ffi.h
        HINTS ${PC_LIBFFI_INCLUDEDIR} ${PC_LIBFFI_INCLUDE_DIRS})

IF (LIBFFI_INCLUDE_DIR)
    FIND_LIBRARY(LIBFFI_LIBRARIES NAMES ffi
            HINTS ${PC_LIBFFI_LIBDIR} ${PC_LIBFFI_LIBRARY_DIRS})
ENDIF()

INCLUDE(FindPackageHandleStandardArgs)
FIND_PACKAGE_HANDLE_STANDARD_ARGS(LibFFI DEFAULT_MSG
        LIBFFI_LIBRARIES LIBFFI_INCLUDE_DIR)

MARK_AS_ADVANCED(LIBFFI_INCLUDE_DIR LIBFFI_LIBRARIES)