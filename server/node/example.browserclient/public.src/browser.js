'use strict'
const {Connection, ExampleGlobal} = require('./westfield-client-example')

const ws = new window.WebSocket('ws://' + window.location.host + '/westfield')// create new websocket connection
ws.binaryType = 'arraybuffer'// set socket type to array buffer, required for westfield connection to work.

// create connection
const connection = new Connection()

// wire connection send to websocket
connection.onFlush = (data) => {
  ws.send(data)
}

// wire websocket message to connection unmarshall
ws.onmessage = (event) => {
  connection.unmarshall(event.data)
  // flush any messages that might have been queued by our call to connection.unmarshall(..)
  connection.flush()
}

ws.onopen = (event) => {
  const registry = connection.createRegistry() // create a registry that will notify us of any current and new globals
  registry.listener.global = (name, interface_, version) => { // register a listener to will be notified if a new global appears
    if (interface_ === ExampleGlobal.name) { // check if we support the global
      const exampleGlobal = registry.bind(name, interface_, version)// create a new object that will be bound to the global
      const exampleClock = exampleGlobal.createExampleClock()// create a new clock object
      exampleClock.listener.timeUpdate = (time) => { // listen for time updates
        document.getElementById('the_time').innerHTML = time.toString()// show the time
      }
    }
  }
  connection.flush()
}
