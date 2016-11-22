//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

wf._Object = function (connection) {

    //--public functions--
    this.delete = function () {
        this.objects.remove(this._id);
        connection.marshall(this._id, 0, []);//opcode 0 is reserved for deletion
    };

    this.postError = function (errorCode, errorMsg) {
        connection.marshallTo(this._id, 255, [//opcode 255 is reserved for error
            {
                value: errorCode,
                type: "i",
                size: 4,
                optional: false,
                marshallTo: function (dataView, offset) {
                    dataView.setInt32(offset, this.value, connection.littleEndian);
                }
            },
            {
                value: errorMsg,
                type: "s",
                size: 4 + errorMsg.length,
                optional: false,
                marshallTo: function (dataView, offset) {
                    dataView.setInt32(offset, 4, connection.littleEndian);
                    let writeOffset = offset + 4;
                    this.value.forEach(new function (char) {
                        dataView.setUint8(writeOffset, char);
                        writeOffset += 1;
                    });
                }
            }
        ]);
    };

    //--constructor--
    const connection = connection;
};

wf.Connection = function (webSocket) {
    //--public properties--
    this.objects = new Map();
    this.littleEndian = true;

    //--private functions--
    const unmarshall = function (blob) {
        //example wire message
        //00 03 01 6e 00 07 69 00 00 04 00 61 00 00 00 03 ef fa 7e
        //translates to:
        //3 (=id),1 (=opcode),n (=new object id) 7 (id value), i (integer) 1024 (integer value), a (array) 3 (array size) [0xef 0xfa 0x7e] (array value)

        //TODO convert blob to message;
    };

    const dispatch = function (message) {
        //TODO interpret message => find object & invoke it's function
    };

    const onSocketOpen = function (event) {
        //TODO send back-end minimal required browser info (we start with screen size)
        //TODO the first request shall be a json informing the host of our properties.
    };

    const onSocketClose = function (event) {

    };

    const onSocketError = function (event) {

    };

    const onSocketMessage = function (event) {
        //TODO as a first response we expect the hosts' wire message endianess
        //TODO the first response shall be a json informing us of the host's properties.

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
    this.marshall = function (id, opcode, argsArray) {
        //determine required wire message length
        let size = 2 + 1;  //id+opcode
        argsArray.forEach(function (arg) {
            if (arg.optional) {
                size += 1; //add one for the optional (=?) ascii char
            }
            size += 1; //add one for the ascii char
            size += arg.size; //add size of the actual argument values
        });

        const wireMsgBuffer = new ArrayBuffer(size);
        const wireMsgView = new DataView(wireMsgBuffer);
        let offset = 0;

        //write actual wire message
        wireMsgView.setUint16(offset, id, this.littleEndian);//id
        offset += 2;
        wireMsgView.setUint8(offset, opcode);//opcode
        offset += 1;

        argsArray.forEach(function (arg) {
            if (arg.optional) {
                wireMsgView.setUint8(offset, "?".codePointAt(0)); //optional ascii char
                offset += 1;
            }
            wireMsgView.setUint8(offset, arg.type.codePointAt(0)); //argument type ascii char
            offset += 1;
            arg.marshallTo(wireMsgView, offset); //write actual argument value to buffer
            offset += arg.size;
        });

        socket.send(wireMsgBuffer);
    };

    this.close = function () {
        this.objects.values().slice().forEach(function (object) {
            object.delete();
        });
        socket.close();
    };

    this._registerObject = function (object) {
        //find unused id.
        let id = 1;
        while (this.objects.has(id)) {
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
