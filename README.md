# Westfield
A HTML5 Wayland protocol generator.

## Client
Generate client side HTML5 compatible javascript using a Wayland protocol xml file.

## Server
Server side generation is supported for:
 - Node.js
 - Java

## Client Usage
Westfield accepts xml files in the Wayland protocol format. All arguments are supported, expect for file descriptors.

`client/generator`
```
$ npm install
$ node generator/westfield-scanner-client.js -- --help
```
or install it globally so you can use it in your build. (Make sure your global node path is added to your PATH env.)
```angular2html
$ npm install -g
$ westfield-scanner-client --help
```

```
 Wayland HTML5 protocol generator for the browser

  Usage:
          westfield-scanner.js FILE... [options]

      Generates a javascript client-side protocol file based on the given FILE argument.
      The FILE argument is a relative or absolute path to a Westfield compatible Wayland XML.
      The generated javascript protocol file is named "westfield-client-FILE.js" if the "--out" 
      argument is omitted or if the "--out" argument resolves to a directory.

      Options:
          -o, --out          output file
          -h, --help         print usage information
          -v, --version      show version info and exit

```

We also need to build the runtime library as it will be needed by the generated protocol file.

`client/runtime`
```
$ npm install
```
or install it globally
```
$ npm install -g
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
$ westfield-scanner-client example.xml
```

This will generate the file `westfield-client-example.js`:
```javascript
/*
 *
 *        Example HTML5 Protocol
 *        Copyright (C) 2017 Erik De Rijcke
 *
 *        This program is free software: you can redistribute it and/or modify
 *        it under the terms of the GNU Affero General Public License as
 *        published by the Free Software Foundation, either version 3 of the
 *        License, or (at your option) any later version.
 *
 *        This program is distributed in the hope that it will be useful,
 *        but WITHOUT ANY WARRANTY; without even the implied warranty of
 *        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *        GNU Affero General Public License for more details.
 *
 *        You should have received a copy of the GNU Affero General Public License
 *        along with this program. If not, see >http://www.gnu.org/licenses/<.
 *    
 */
const wfc = require('westfield-runtime-client');
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
		return this.connection._marshallConstructor(this._id, 1, "example_clock", [wfc._newObject()]);
	}

	constructor(connection) {
		super(connection, {
			name: "example_global",
			version: 1,
		});
	}

};

/**
 */
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
		const args = this.connection._unmarshallArgs(message,"u");
		this.listener.time_update.call(this.listener, args[0]);
	}

};
module.exports = wfc;
```

and subsequently used in `compositor-client.js`
```javascript
"use strict";
const wfc = require("./westfield-client-example.js");

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

To include the generated file in your build, you will need a CommonJS module aware build system like webpack.

Example webpack.config.js
```javascript
const path = require('path');

module.exports = {
    entry: './public.src/compositor-client.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'compositor-client.bundle.js'
    }
};
```

Which can then be included in your `index.html`.
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Westfield Example</title>
    <script src="compositor-client.bundle.js"></script>
</head>
<body>
<h1 id="the_time"></h1>
</body>
</html>
```

# Server usage

Check out the Java and Node.js example projects in the `server` directory. They implement the server side part of the client example mentioned above.
They also provide a good starting point to setup server and client side protocol generation in your build.

