"use strict";
const connection = new wfc.Connection("ws://127.0.0.1:8080/westfield");//connect to the server
connection.registry.listener.global = (name, interface_, version) => {//register a listener to will be notified if a new global appears
    if (interface_ === "example_global") {//check if we support the global
        const exampleGlobal = connection.registry.bind(name, interface_, version);//create a new object that will be bound to the global
        const exampleClock = exampleGlobal.create_example_clock();//create a new clock object
        exampleClock.listener.time_update = (time) => {//listen for time updates
            document.getElementById("the_time").innerHTML = time.toString();//show the time
        };
    }
};