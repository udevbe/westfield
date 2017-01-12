# Westfield
A HTML5 Wayland protocol generator.

## Client
Generate client side HTML5 compatible javascript using a Wayland protocol xml file.

## Server
Server side generation is supported for various languages.

## Usage
Westfield accepts xml files in the Wayland protocol format. All arguments are supported, expect for file descriptors.

Inside the Westfield directory:
```
$ npm install
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

### Example

Given the file `example.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<protocol name="example" version="1">
    <copyright>
        Example HTML5 Protocol
        Copyright (C) 2017 Erik De Rijcke
    </copyright>

    <interface name="example_global" version="1">
        <description>
            An example global singleton. Functions as a factory for other example objects.
        </description>

        <request name="create_example_clock" since="1">
            <description>
                Creates an example clock object that sends out time events.
            </description>
            <arg name="id" type="new_id" interface="example_clock" summary="A new example clock."/>
        </request>
    </interface>

    <interface name="example_clock" version="1">
        <description>
            An example clock object. A clock sends out a time update every millisecond.
        </description>
        <event name="time_update" since="1">
            <description>
                Called when the clock receives a time update.
            </description>
            <arg name="the_time" type="uint" summary="The updated time."/>
        </event>
    </interface>
</protocol>
```

We can generate the client side stubs:
```
$ npm start -- example.xml
```
or
```
$ node generator/westfield-scanner.js example.xml
```
or
```
$ cd generator && chmod +x westfield-scanner.js
$ ./westfield-scanner.js example.xml
```

This will generate the file `westfield-client-example.js`:
```javascript
/*
 *
 *        Example HTML5 Protocol
 *        Copyright (C) 2017 Erik De Rijcke
 *
 */

/**
 */
wfc.example_global = class example_global extends wfc.WObject {

	/**
	 *
	 * @return {example_clock} A new example clock.
	 *
	 * @since 1
	 *
	 */
	create_example_clock() {
		return this._connection._marshallConstructor(this._id, 1, "example_clock", [wfc._newObject()]);
	}

	constructor(connection) {
		super(connection, {
			name: "example_global",
			version: 1,
		});
	}

};
wfc.example_clock = class example_clock extends wfc.WObject {

	constructor(connection) {
		super(connection, {
			name: "example_clock",
			version: 1,

			/**
			 *
			 * @param {Number} the_time The updated time.
			 *
			 * @since 1
			 *
			 */
			time_update(the_time) {},
		});
	}

	[1](message){
		const args = this._connection._unmarshallArgs(message,"u");
		this.listener.time_update.call(this.listener, args[0]);
	}

};
```

Which can then be included in your `index.html` together with `westfield-client-core.js`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Westfield Example</title>
    <script src="westfield-client-core.js"></script>
    <script src="westfield-client-example.js"></script>
    <script src="example.js"></script>
</head>
<body>
 <h1 id="the_time"></h1>
</body>
</html>
```

and subsequently used in `example.js`
```javascript
"use strict";

//connect to the server
const connection = new wfc.Connection("ws://127.0.0.1:8080/westfield");

//register a listener to will be notified if a new global appears
connection.registry.listener.global = (name, interface_, version) => {

    //check if we support the global
    if (interface_ === "example_global") {

        //create a new object that will be bound to the global
        const exampleGlobal = connection.registry.bind(name, interface_, version);

        //create a new clock object
        const exampleClock = exampleGlobal.create_example_clock();

        //listen for time updates
        exampleClock.listener.time_update = (time) => {

            //show the time
            document.getElementById("the_time").innerHTML = time.toString();
        };
    }
};
```
