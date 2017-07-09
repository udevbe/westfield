'use strict'
const wfc = require('./westfield-client-example.js')

const ws = new window.WebSocket('ws://127.0.0.1:8080/westfield')// create new websocket connection
const connection = new wfc.Connection()// create connection

connection.onSend = (data) => {
  ws.send(data)
}// wire connection send to websocket
ws.onmessage = (event) => {
  connection.unmarshall(event.data)
}// wire websocket message to connection unmarshall

connection.registry.listener.global = (name, interface_, version) => { // register a listener to will be notified if a new global appears
  if (interface_ === 'example_global') { // check if we support the global
    const exampleGlobal = connection.registry.bind(name, interface_, version)// create a new object that will be bound to the global
    const exampleClock = exampleGlobal.create_example_clock()// create a new clock object
    exampleClock.listener.time_update = (time) => { // listen for time updates
      document.getElementById('the_time').innerHTML = time.toString()// show the time
    }
  }
}
