//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

wf._Object = function (connection) {
    //--public functions--
    this.delete = function () {
        connection._objects.remove(this._id);
    };

    this.postError = function (errorCode, errorMsg) {
        //TODO send error on connection
    };

    //--constructor--
    const connection = connection;
};

//WIRE FORMAT proposal:

//example message format:
//corresponding wire message: 00 03 (id) 01 (opcode) 6e 3f 69 6f 61 00 00 00 14 00 (signature) 00 07 (arg0) 00 00 00 00 (arg1) 00 05 (arg2) fe 12 74 54 67 43 fa a8 ea b3 c8 93 75 36 8e 72 75 92 74 81 (arg3)
// message = {
//     id: 3, //used to find the object with id 3: uint16
//     opcode: 1, //used find the function of object that corresponds to opcode 1: uin8
//     signature: "n?ioa", //used to define the type of the arguments (n= new object with id: uin16, ? = optional, i = integer: sint32, o = existing object with id: uin16, a = array followed by uint32 for size): null terminated char array
//     argsArray: [7, undefined, 5, new ArrayBuffer(20)] // to be used with js' "apply" call.
// };

//example generated object:
// wf.Foo = function (connection) {
//
//     this.__1 = function (argsArray) {
//         this.bar.apply(this, argsArray);
//     };
//
//     //--constructor--
//     wf._Object.call(this, connection);
// };
// wf.Foo.prototype = Object.create(wf._Object);

//TODO we probably want to set a group of functions (an implemented interface)?
//example user implementation:
//foo.bar = myBar;

//example invocation:
// function dispatch(message) {
//     this._objects[message.id]["__"+message.opcode](message.argsArray);
// }

wf.Connection = function (webSocket) {

    //--public properties--
    this._objects = new Map();

    //--private functions--
    const parse = function (blob) {
        //TODO convert blob to message;

    };

    const dispatch = function (message) {
        //TODO interpret message => find object & invoke it's function
    };

    const onSocketOpen = function (event) {
        //TODO send back-end minimal required browser info (we start with screen size)
    };

    const onSocketClose = function (event) {

    };

    const onSocketError = function (event) {

    };

    const onSocketMessage = function (event) {
        const message = parse(event);
        dispatch(message);
    };

    const setupSocket = function (socket) {
        socket.onopen = onSocketOpen;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;
        socket.onmessage = onSocketMessage;

        return socket;
    };

    //--public functions--
    this.send = function (data) {
        socket.send(data);
    };

    this.close = function () {
        socket.close();
    };

    this._registerObject = function (object) {
        //find unused id.
        var id = 1;
        while (this._objects.has(id)) {
            id++;
        }
        object._id = id;
        this._objects.set(object._id, object);
    };

    //--constructor--
    const socket = setupSocket(webSocket);
    this._registerObject(this.registry);
};

wf.connect = function (socketUrl) {
    const socket = new WebSocket(socketUrl, "westfield");
    const connection = new wf.Connection(socket);

    //registry will be defined by the protocol generator
    const registry = new wf.Registry();
    connection._registerObject(registry);
    connection.registry = registry;

    return connection;
};
