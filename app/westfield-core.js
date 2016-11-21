//TODO connection routine
//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

wf.Registry = function () {
    //more empty public functions are added by the protocol generator
};

wf._Message = function () {
    //TODO define message format
};

wf._Connection = function () {

    //--private properties--
    let lastObjectId = 1;

    //--public properties--
    this.objects = new Map();

    //--private functions--
    const parseWireMessage = function (blob) {
        //TODO convert blob to wf._Message;

        return new wf._Message();
    };

    //--public functions--
    this.insertObject = function (object) {
        object._id = lastObjectId++;
        this.objects.set(lastObjectId, object);
        return object;
    };

    this.dispatch = function (blob) {
        const message = parseWireMessage(blob);
        //TODO interpret message => find object & invoke it's function
    };
};

//westfield display core functionality
wf.Display = function (webSocket) {

    //--private properties--
    const connection = new wf._Connection();

    //--public properties--
    Object.defineProperty(this, "registry", {
        value: new wf.Registry(),
        writable: false
    });

    //--private functions--
    const onSocketOpen = function (event) {
        //TODO send back-end minimal required browser info (we start with screen size)
    };

    const onSocketClose = function (event) {

    };

    const onSocketError = function (event) {

    };

    const onSocketMessage = function (event) {
        if (event instanceof Blob) {
            connection.dispatch(event);
        }
    };

    const setupSocket = function (socket) {
        socket.onopen = onSocketOpen;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;
        socket.onmessage = onSocketMessage;

        return socket;
    };

    //--public functions--
    this.disconnect = function () {
        socket.close();
    };

    //more empty public functions are added by the protocol generator

    //--constructor--
    const socket = setupSocket(webSocket);
    connection.insertObject(this);
    connection.insertObject(this.registry);
};

wf.connect = function (socketUrl) {
    const socket = new WebSocket(socketUrl, "westfield");
    return new Display(socket);
};
