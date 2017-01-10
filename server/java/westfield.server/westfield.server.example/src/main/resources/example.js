const wConnection = new wfc.WConnection("ws://127.0.0.1:8080/westfield");

let exampleGlobal;
let exampleClock;

function onTimeUpdate(time) {
    const date = new Date(time);
    document.getElementById("the_time").innerHTML = "Server time UTC: "+date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds();
}

function onGlobal(name, interface_, version) {
    if (interface_ === "example_global") {
        exampleGlobal = wConnection.registry.bind(name, interface_, version);
        exampleClock = exampleGlobal.create_example_clock();
        exampleClock.listener.time_update = onTimeUpdate;
    }
    //else unknown/unsupported global
}
wConnection.registry.listener.global = onGlobal;