Moved to [https://github.com/udevbe/greenfield](https://github.com/udevbe/greenfield) monorepo

# Westfield

[![Build Status](https://travis-ci.org/udevbe/westfield.svg)](https://travis-ci.org/udevbe/westfield)


A JavaScript Wayland protocol generator. Generates JavaScript RPC stubs based on a wayland xml to let native Wayland
applications talk the browser. The primary use case being [Greenfield](https://github.com/udevbe/greenfield).

server
======

Inside the `server/node` directory the following modules are present:

- **runtime**: Provides the server side api and other tooling required at runtime.

- **generator**: Generates server side protocol stubs at build time, using a Wayland protocol xml file.

- **endpoint**: A shim Wayland compositor. Forwards raw wire protocol messages.

- **endpoint-native**: A fork of libwayland-server used by the endpoint module. 
  - *Requires native libffi headers to build. `sudo apt-get install -y libffi-dev`*
  - *Requires cmake-js on your path. `npm install -g cmake-js`*

- **endpoint-generator**: Generates shim Wayland server protocol stubs to properly interoperate with natively implemented Wayland server libraries.
