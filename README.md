# Westfield
A HTML5 Wayland protocol generator.

## Client
Generate client side HTML5 compatible javascript using a Wayland protocol xml file.

## Server
Server side generation is supported for various languages.

## Usage
```
$ npm install
```
```
$ npm start -- --help

> node generator/westfield-scanner.js "--help"


  Wayland HTML5 protocol generator

  Usage:
          westfield-scanner.js FILE... [options]

      Generates a javascript protocol file based on the given FILE argument.
      The FILE argument is a relative or absolute path to a Westfield compatible Wayland XML.
      The generated javascript protocol file is named "westfield-client-FILE.js".

      Options:
          -h, --help         print usage information
          -v, --version      show version info and exit
```