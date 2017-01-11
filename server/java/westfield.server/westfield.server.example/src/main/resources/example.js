"use strict";
const connection = new wfc.Connection("ws://127.0.0.1:8080/westfield");
connection.registry.listener.global = (name, interface_, version) => {
    if (interface_ === "example_global") {
        const exampleGlobal = connection.registry.bind(name, interface_, version);
        const exampleClock = exampleGlobal.create_example_clock();
        exampleClock.listener.time_update = (time) => {
            document.getElementById("the_time").innerHTML = time.toString();
        };
    }
};