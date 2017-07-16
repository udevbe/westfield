# Westfield

A Javascript compatible Wayland protocol generator.

## client-scanner
`npm install westfield-scanner-client --save-dev`

Generates client side protocol stubs at build time, using a Wayland protocol xml file. The generated code is usable
in both browser and Node.js.

## client-runtime
`npm install westfield-runtimer-client --save`

Provides client side core api and underlying protocol marshalling, required at runtime.

## server-scanner
`npm install westfield-scanner-server --save-dev`

Generates server side protocol stubs at build time, using a Wayland protocol xml file. The generated code is usable
in both browser and Node.js

## server-runtime
`npm install westfield-runtimer-server --save`

Provides server side core api and underlying protocol marshalling, required at runtime.

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

and subsequently used in `browser.js`
```javascript
'use strict'
const wfc = require('./westfield-client-example.js')

const ws = new window.WebSocket('ws://127.0.0.1:8080/westfield')// create new websocket connection
ws.binaryType = 'arraybuffer'// set socket type to array buffer, required for wfc connection to work.

const connection = new wfc.Connection()// create connection
connection.onSend = (data) => {
  ws.send(data)
}// wire connection send to websocket
ws.onmessage = (event) => {
  connection.unmarshall(event.data)
}// wire websocket message to connection unmarshall

ws.onopen = (event) => {
  const registry = connection.createRegistry() // create a registry that will notify us of any current and new globals
  registry.listener.global = (name, interface_, version) => { // register a listener to will be notified if a new global appears
    if (interface_ === 'example_global') { // check if we support the global
      const exampleGlobal = registry.bind(name, interface_, version)// create a new object that will be bound to the global
      const exampleClock = exampleGlobal.create_example_clock()// create a new clock object
      exampleClock.listener.time_update = (time) => { // listen for time updates
        document.getElementById('the_time').innerHTML = time.toString()// show the time
      }
    }
  }
}
```

To include the generated file in your build, you will need a CommonJS module aware build system like webpack.

Example webpack.config.js
```javascript
const path = require('path')

module.exports = {
  entry: './public.src/browser.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'browser.bundle.js'
  }
}
```

Which can then be included in your `index.html`.
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Westfield Example</title>
    <script src="browser.bundle.js"></script>
</head>
<body>
<h1 id="the_time"></h1>
</body>
</html>
```

# Server usage

You can implement the server side in Node.js. 

Continuing from client example, the generate protocol file `westfield-server-example.s` will look like this:
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
const wfs = require('westfield-runtime-server');
/**
 */
wfs.example_global = class example_global extends wfs.Resource {

	constructor(client, id, version) {
		super(client, id, version, {
			name: "example_global",
			version: 1,

			/**
			 *
			 * @param {example_global} resource 
			 * @param {*} id A new example clock. 
			 *
			 * @since 1
			 *
			 */
			create_example_clock(resource, id) {},
		});
	}

	[1](message){
		const args = this.client._unmarshallArgs(message,"n");
		this.implementation.create_example_clock.call(this.implementation, this, args[0]);
	}

};

/**
 */
wfs.example_clock = class example_clock extends wfs.Resource {

	/**
	 *
	 * @param {Number} the_time The updated time. 
	 *
	 * @since 1
	 *
	 */
	time_update(the_time) {
		this.client._marshall(this.id, 1, [wfs._uint(the_time)]);
	}

	constructor(client, id, version) {
		super(client, id, version, {
			name: "example_clock",
			version: 1,
		});
	}

};
module.exports = wfs;
```


Which we can implement server side in `nodeserver.js`:
```javascript
#!/usr/bin/env node
'use strict'

const wfs = require('./westfield-server-example.js')
const WebSocket = require('ws')
const express = require('express')
const http = require('http')

// Create a new global singleton clock-factory implementation.
const exampleGlobal = new wfs.Global('example_global', 1)
exampleGlobal.bindClient = function (client, id, version) {
  // Create a new example-global resource when a client binds to the global.
  const resource = new wfs.example_global(client, id, version)

  // Assign implemented factory method.
  resource.implementation.create_example_clock = createExampleClock
}

// Implementation of the example-clock factory method that we assigned earlier.
function createExampleClock (resource, id) {
  // Create a new example clock resource.
  const clockResource = new wfs.example_clock(resource.client, id, 1)

  // Send time update events to the client.
  setInterval(function () {
    clockResource.time_update(new Date().getTime())
  }, 1)
}

// Create westfield server. Required to expose global singleton protocol objects to clients.
const wfsServer = new wfs.Server()

// Register the global so clients can find it when they connect.
wfsServer.registry.register(exampleGlobal)

// setup connection logic (http+websocket)
const app = express()
app.use(express.static('public'))

const server = http.createServer()
server.on('request', app)
const wss = new WebSocket.Server({
  server: server,
  path: '/westfield'
})

// listen for new websocket connections.
wss.on('connection', function connection (ws) {
  // Make sure we detected disconnects asap.
  ws._socket.setKeepAlive(true)

  // A new connection was established. Create a new westfield client object to represent this connection.
  const client = wfsServer.createClient()

  // Wire the send callback of this client object to our websocket.
  client.onSend = function (wireMsg) {
    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
      // Fail silently as we will soon receive the close event which will trigger the cleanup.
      return
    }

    try {
      ws.send(wireMsg, function (error) {
        if (error !== undefined) {
          console.error(error)
          ws.close()
        }
      })
    } catch (error) {
      console.error(error)
      ws.close()
    }
  }

  // Wire data receiving from the websocket to the client object.
  ws.onmessage = function incoming (message) {
    try {
      // The client object expects an ArrayBuffer as it's argument.
      // Slice and get the ArrayBuffer of the Node Buffer with the provided offset, else we take too much data into account.
      client.message(message.data.buffer.slice(message.data.offset, message.data.length + message.data.offset))
    } catch (error) {
      console.error(error)
      ws.close()
    }
  }

  // Wire closing of the websocket to our client object.
  ws.onclose = function () {
    client.close()
  }
})

// Listen for incoming http requests on port 8080.
server.listen(8080)
```

# Further examples
Check out the Node.js example projects in the `server` directory. They implement the example mentioned above as well
as the reverse case where the browser acts as a 'server'.

They also provide a good starting point to setup server and client side protocol generation in your build.

