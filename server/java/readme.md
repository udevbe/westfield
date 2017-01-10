Westfield Java server side implementation
=========================================

A Java implementation of the Westfield server side library.

The Westfield Java implementation consists of 3 parts:

 - Common runtime library
 - Protocol generator
 - Example application
 
 Common runtime library
 ----------------------
 The runtime library is the bare minimum that any server application
 needs.
 
 Protocol generator
 ------------------
 The protocol generator is implemented as a compile
 time annotation processor. It generates Java stubs based
 on the protocol xml.
 
 Example application
 -------------------
 An example application that shows the capabilities and 
 provides a basic how-to of the Java Westfield library.