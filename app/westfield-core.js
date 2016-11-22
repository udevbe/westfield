//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

wf._Object = function (connection) {
    //--public functions--
    this.delete = function () {
        this.objects.remove(this._id);
        connection.marshall(this._id, 0, "o", [object._id]);
    };

    this.postError = function (errorCode, errorMsg) {
        //TODO send error on connection
    };

    //--constructor--
    const connection = connection;
};

//WIRE FORMAT proposal:

//example message format from client to server:
//corresponding wire message: 00 03 (id) 01 (opcode) 6e 3f 69 6f 61 00 (signature) 00 07 (arg0) 00 00 00 00 (arg1) 00 05 (arg2) 00 00 00 14 fe 12 74 54 67 43 fa a8 ea b3 c8 93 75 36 8e 72 75 92 74 81 (arg3)
// message = {
//     id: 3, //used to find the object with id 3: uint16
//     opcode: 1, //used find the function of object that corresponds to opcode 1. Opcode 0 is reserved: uint8
//     signature: "n?ioa", //used to define the type of the arguments (n= new object with id: uin16, ? = optional, i = integer: sint32, o = existing object with id: uin16, a = array): null terminated char array
//     argsArray: [7, undefined, 5, new ArrayBuffer(20)] // to be used with js' "apply" call.
// };

//example generated object:
// wf.Foo = function (connection) {
//
//     this.1 = function (argsArray) {
//         this.bar.apply(this, argsArray);
//     };
//
//     //--constructor--
//     wf._Object.call(this, connection);
// };
// wf.Foo.prototype = Object.create(wf._Object);

wf.Connection = function (webSocket) {

    //--private properties--
    this.objects = new Map();

    //--private functions--
    const unmarshall = function (blob) {
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
        const message = unmarshall(event);
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
    this.marshall = function (id, opcode, signature, argsArray) {

        //TODO make this function great again.

        //determine length
        //id(2)+opcode(1)
        var size = 3;
        //signature.length+null byte
        size += signature.length + 1;

        const wireCharsAscii = [];
        var argi = 0;
        //first pass, determine size
        var optional = false;
        for (var i = 0; i < signature.length; i++) {
            var signatureChar = signature[i];
            wireCharsAscii[i] = signatureChar.charCodeAt(i);
            switch (signatureChar) {
                case "i": //integer, sint32 -> 4
                case "f": //fixed, uint32 -> 4
                    size += 4;
                    argi++;
                    break;
                case "o": //object, uint16 -> 2
                case "n": //new object, uint16 -> 2
                    size += 2;
                    argi++;
                    break;
                case "s": //string, 4+data length (in bytes)
                case "a": //array, 4+data length (in bytes)

                    const arg = argsArray[argi];
                    if (optional && arg == undefined) {
                        size += 4;
                    }
                    else if (arg instanceof ArrayBuffer || arg instanceof String) {
                        size += 4;
                        size += arg.length;
                    }
                    else {
                        throw new TypeError("Argument #" + argi + " is not of type ArrayBuffer or String.");
                    }

                    argi++;
                    break;
                case "?": //optional -> 0
                    optional = true;
                    break;
                default:
                //TODO more types
            }
        }
        wireCharsAscii[wireCharsAscii.length] = 0;

        const wireMsg = new ArrayBuffer(size);
        const wireMsgView = new DataView(wireMsg);
        var offset = 0;

        wireMsgView.setInt16(offset, id, true);//id
        offset += 2;

        wireMsgView.setInt8(offset, opcode);//opcode
        offset += 1;

        wireCharsAscii.forEach(function (asciiChar) {
            wireMsg.setInt8(offset, asciiChar);
            offset += 1;
        });

        //second pass, fill in buffer
        argi = 0;
        optional = false;
        for (i = 0; i < signature.length; i++) {
            signatureChar = signature[i];
            const arg = argsArray[argi];
            switch (signatureChar) {
                case "i":
                case "f":
                    if (optional && arg == undefined) {
                        wireMsgView.setInt32(offset, 0, true);
                        optional = false;
                    } else {
                        wireMsgView.setInt32(offset, arg, true);
                    }
                    offset += 4;

                    argi++;
                    break;
                case "o":
                case "n":
                    if (optional && arg == undefined) {
                        wireMsgView.setUint16(offset, 0, true);
                        optional = false;
                    } else {
                        wireMsgView.setUint16(offset, arg, true);
                    }
                    offset += 2;

                    argi++;
                    break;
                case "s":
                case "a":
                    if (optional && arg == undefined) {
                        wireMsgView.setInt32(offset, 0, true);
                        offset += 4;
                        optional = false;
                    } else {
                        wireMsgView.setInt32(offset, arg.length, true);
                        offset += 4;
                        arg.forEach(new function (byte) {
                            wireMsg.setInt8(offset, byte);
                            offset += 1;
                        });
                    }

                    argi++;
                    break;
                case "?":
                    optional = true;
                    break;
                default:
                    throw new TypeError("Unrecognized type " + signatureChar + " in signature for arg #" + argi);
                //TODO more types
            }
        }

        socket.send(wireMsg);
    };

    this.close = function () {
        this.objects.values().slice().forEach(function (object) {
            object.delete();
        });
        socket.close();
    };

    this._registerObject = function (object) {
        //find unused id.
        var id = 1;
        while (this._objects.has(id)) {
            id++;
        }
        object._id = id;
        this.objects.set(object._id, object);
    };

    //--constructor--
    const socket = setupSocket(webSocket);
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
