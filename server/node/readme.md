Westfield NodeJS server side implementation
=========================================

A NodeJS implementation of the Westfield server side library.

The Westfield NodeJS implementation consists of 3 parts:

 - Common runtime library
 - Protocol generator
 - Example application
 
 Common runtime library
 ----------------------
 The runtime library is the bare minimum that any server application needs.
 
 Protocol generator
 ------------------
 The protocol generator is implemented as a stand alone application. You can include it in the scripts part of your
 package.json. It generates javascript stubs based on the protocol xml.
 
 Example application
 -------------------
 An example application that shows the capabilities and provides a basic how-to of the NodeJS Westfield library.