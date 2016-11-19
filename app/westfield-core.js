//TODO connection routine
//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

//TODO display scoped object id generator

wf.connect = function (url) {
    const socket = new WebSocket(url, "westfield");
    return new Display(1, socket);
}

wf.connectToSocket = function (webSocket) {
    return new Display(1, webSocket);
}

wf.Proxy = function (objectId) {
    Object.defineProperty(this, "objectId", {
        value: objectId,
        writable: false
    });
};

wf.Registry = function (id) {
    //--constructor--
    Proxy.call(this, id);

    //more empty public functions are added by the protocol generator
}
wf.Registry.prototype = Object.create(wf.Proxy.prototype);

wf.Dispatcher = function (nextObjectid) {
    this.onWireMessage = function (blob) {
        //TODO parse blob
        //TODO find proxy object and call it
    };

    //--constructor--
    const nextObjectId = nextObjectid;
};

//westfield display core functionality
wf.Display = function (id, webSocket) {

    //--object management--
    const proxyRegistry = new Map();
    var lastObjectId = 1;
    const nextObjectId = function () {
        return lastObjectId++;
    };

    //--public properties--
    Object.defineProperty(this, "registry", {
        value: new wf.Registry(nextObjectId()),
        writable: false
    });

    //--private properties--
    const dispatcher = new Dispatcher(nextObjectId);

    //--public functions--
    this.disconnect = function () {
        socket.close();
    };

    //more empty public functions are added by the protocol generator

    //--private functions--
    const onSocketOpen = function (event) {
        //TODO send back-end minimal required browser info (we start with screen size)
    };

    const onSocketClose = function (event) {

    };

    const onSocketError = function (event) {

    };

    const setupSocket = function (socket) {
        socket.onopen = onSocketOpen;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;

        socket.onmessage = dispatcher.onWireMessage;

        return socket;
    };

    //--constructor--
    Proxy.call(this, id);
    const socket = setupSocket(webSocket);
};
wf.Display.prototype = Object.create(wf.Proxy.prototype);