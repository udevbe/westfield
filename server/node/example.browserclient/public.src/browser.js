'use strict'
const wfc = require('./westfield-client-example.js')

const ws = new window.WebSocket('ws://' + window.location.host + '/westfield')// create new websocket connection
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
