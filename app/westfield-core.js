//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

/**
 *
 * @param {Number} number
 * @constructor
 */
wf.Fixed = function (number) {
    //TODO
};

wf._Object = function (connection) {

    //--public functions--
    /**
     *
     */
    this.delete = function () {
        this._connection._objects.remove(this._id);
        this._connection._marshall(this._id, 0, []);//opcode 0 is reserved for deletion
    };

    /**
     *
     * @param {Number} errorCode an integer error code
     * @param {String} errorMsg the error message
     */
    this.postError = function (errorCode, errorMsg) {
        this._connection._marshall(this._id, 255, [//opcode 255 is reserved for error
            {
                value: errorCode,
                type: "i",
                size: 4,
                optional: false,
                marshallTo: function (dataView, offset) {
                    dataView.setInt32(offset, this.value, this._connection._littleEndian);
                }
            },
            {
                value: errorMsg,
                type: "s",
                size: 4 + errorMsg.length,
                optional: false,
                marshallTo: function (dataView, offset) {
                    dataView.setInt32(offset, 4, this._connection._littleEndian);
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
    this._connection = connection;
};

wf.Connection = function (socketUrl) {

    //--properties--
    /**
     *
     * @type {Map}
     * @private
     */
    this._objects = new Map();
    /**
     *
     * @type {boolean}
     * @private
     */
    this._littleEndian = true;

    //--functions--
    /**
     *
     * @param {DataView} wireMsg
     * @returns {*}
     * @private
     */
    this._unmarshallArg = function (wireMsg) {
        const typeAscii = wireMsg.getUint8(wireMsg.offset);
        wireMsg.offset += 1;

        switch (String.fromCharCode(typeAscii)) {
            case "i"://{Number}
                const arg = wireMsg.getInt32(wireMsg.offset, this._littleEndian);
                wireMsg.offset += 4;
                return arg;
            case "f"://{wf.Fixed}
                const arg = wireMsg.getInt32(wireMsg.offset, this._littleEndian);
                wireMsg.offset += 4;
                return new wf.Fixed(arg);
            case "o"://existing object, subtype of {wf._Object}
                const id = wireMsg.getUint16(wireMsg.offset, this._littleEndian);
                wireMsg.offset += 2;
                return this._objects.get(id);
            case "n":///new object, subtype of {wf._Object}
                const id = wireMsg.getUint16(wireMsg.offset, this._littleEndian);
                wireMsg.offset += 2;
                const typeNameSize = wireMsg.getUint8(wireMsg.offset);
                wireMsg.offset += 1;
                const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, typeNameSize);
                wireMsg.offset += typeNameSize;

                const type = String.fromCharCode.apply(null, byteArray);
                const object = new wf[type](this);
                object._id = id;
                this._objects.set(object._id, object);

                return object;
            case "s"://{String}
                const stringSize = wireMsg.getInt32(wireMsg.offset, this._littleEndian);
                wireMsg.offset += 4;
                const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, stringSize);
                wireMsg.offset += stringSize;

                return String.fromCharCode.apply(null, byteArray);
            case "a"://{ArrayBuffer}
                //TODO
                break;
        }
    };

    /**
     *
     * @param {ArrayBuffer} message
     * @private
     */
    this._unmarshall = function (message) {
        //example wire message
        //[00 03] [01] [6e 00 07 03 66 6f 6f] [69 00 00 04 00] [61 00 00 00 03 ef fa 7e]
        //translates to:
        //3 (=id),1 (=opcode),n (=new object id) 7 (id value) 3 (object name lenght) foo (object type), i (integer) 1024 (integer value), a (array) 3 (array size) [0xef 0xfa 0x7e] (array value)

        //TODO convert blob to message;
        //TODO interpret message => find object & invoke it's function
        const wireMsg = new DataView(message);
        wireMsg.offset = 0;

        const id = wireMsg.getUint16(wireMsg.offset, this._littleEndian);
        wireMsg.offset += 2;

        const opcode = wireMsg.getUint8(wireMsg.offset);
        wireMsg.offset += 1;

        const args = [];
        let argi = 0;

        while (wireMsg.offset < message.byteLength) {
            args[argi] = this._unmarshallArg(wireMsg);
            argi++;
        }

        const obj = this._objects.get(id);
        return {
            obj: obj,
            opcode: opcode,
            args: args
        };
    };

    this._onSocketOpen = function (event) {
        //TODO send back-end minimal required browser info (we start with screen size)
        //TODO the first request shall be a json informing the host of our properties.
    };

    this._onSocketClose = function (event) {

    };

    this._onSocketError = function (event) {

    };

    this._onSocketMessage = function (event) {
        //TODO as a first response we expect the hosts' wire message endianess
        //TODO the first response shall be a json informing us of the host's properties.
        //all subsequent message will be in the binary wire format.

        const message = this._unmarshall(event);
        message.obj[message.opcode](message.args);
    };

    this._setupSocket = function (socket) {
        socket.onopen = this._onSocketOpen;
        socket.onclose = this._onSocketClose;
        socket.onerror = this._onSocketError;
        socket.onmessage = this._onSocketMessage;

        return socket;
    };

    /**
     * Marshall a js function call into a binary message and send it to the remote host.
     *
     * @param {Number} id the object._id
     * @param {Number} opcode the wire protocol opcode of the function
     * @param {Array} argsArray An array of private argument literals
     * @private
     */
    this._marshall = function (id, opcode, argsArray) {
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
        wireMsgView.setUint16(offset, id, this._littleEndian);//id
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

    /**
     * Close the connection to the remote host. All objects will be deleted before the connection is closed.
     */
    this.close = function () {
        this._objects.values().slice().forEach(function (object) {
            object.delete();
        });
        socket.close();
    };

    /**
     * Register an object and give it a new id.
     * @param {Object} object
     * @private
     */
    this._registerObject = function (object) {
        //find unused id.
        let id = 0x10000; //host constructed object ids will be below this range.
        while (this._objects.has(id)) {
            id++;
        }
        object._id = id;
        this._objects.set(object._id, object);
    };

    //--constructor--
    const socket = this._setupSocket(new WebSocket(socketUrl, "westfield"));
    //registry will be defined by the protocol generator
    this.registry = new wf.Registry();
    this._registerObject(this.registry);
};
