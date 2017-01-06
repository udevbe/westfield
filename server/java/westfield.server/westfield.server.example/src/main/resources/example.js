const wConnection = new wfc.WConnection("ws://127.0.0.1:8080/westfield");
wConnection.registry.iface.global = function(name, interface_, version) {
    console.log(interface_);
}