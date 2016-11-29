//westfield client namespace
const wfc = {};

//-- js argument to wire format literals: integer (number), float (number), object (wf._Object), new object (wf._Object), string (string), array (ArrayBuffer) --

wfc._int = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setInt32(dataView.offset, this.value);
            dataView.offset += this.size;
        }
    };
};

wfc._intOptional = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: true,
        _marshallArg: function (dataView) {
            if (arg == null) {
                dataView.setInt32(dataView.offset, 0);
            } else {
                dataView.setInt32(dataView.offset, this.value);
            }
            dataView.offset += this.size;
        }
    }
};

wfc._float = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setFloat32(dataView.offset, this.value);
            dataView.offset += this.size;
        }
    };
};

wfc._floatOptional = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: true,
        _marshallArg: function (dataView) {
            if (arg == null) {
                dataView.setFloat32(dataView.offset, 0);
            }
            else {
                dataView.setFloat32(dataView.offset, this.value);
            }
            dataView.offset += this.size;
        }
    };
};

wfc._object = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 4,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value._id);
            dataView.offset += this.size;
        }
    };
};

wfc._objectOptional = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 4,
        optional: true,
        _marshallArg: function (dataView) {
            if (arg == null) {
                dataView.setUint32(dataView.offset, 0);
            } else {
                dataView.setUint32(dataView.offset, this.value._id);
            }
            dataView.offset += this.size;
        }
    };
};

wfc._newObject = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 4 + 1 + (typeof arg).length,//id+length+name
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value._id);
            dataView.offset += 4;
            const objType = (typeof this.value);
            dataView.setUint8(dataView.offset, objType.length);
            dataView.offset += 1;
            objType.forEach(new function (char) {
                dataView.setUint8(dataView.offset, char.codePointAt(0));
                dataView.offset += 1;
            });
        }
    };
};

wfc._newObjectOptional = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 4 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return 1 + (typeof arg).length;
            }
        })(),//id+length+name
        optional: true,
        _marshallArg: function (dataView) {
            if (this.value == null) {
                dataView.setUint32(dataView.offset, 0);
                dataView.offset += 4;
            } else {
                dataView.setUint32(dataView.offset, this.value._id);
                dataView.offset += 4;
                const objType = (typeof this.value);
                dataView.setUint8(dataView.offset, objType.length);
                dataView.offset += 1;
                objType.forEach(new function (char) {
                    dataView.setUint8(dataView.offset, char.codePointAt(0));
                    dataView.offset += 1;
                });
            }
        }
    };
};

wfc._string = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + arg.length,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setInt32(dataView.offset, this.value.length);
            dataView.offset += 4;
            this.value.forEach(new function (char) {
                dataView.setUint8(dataView.offset, char.codePointAt(0));
                dataView.offset += 1;
            });
        }
    };
};

wfc._stringOptional = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return arg.length;
            }
        })(),
        optional: false,
        _marshallArg: function (dataView, offset) {
            if (this.value == null) {
                dataView.setInt32(dataView.offset, 0);
                dataView.offset += 4;
            } else {
                dataView.setInt32(dataView.offset, this.value.length);
                dataView.offset += 4;
                this.value.forEach(new function (char) {
                    dataView.setUint8(dataView.offset, char.codePointAt(0));
                    dataView.offset += 1;
                });
            }
        }
    };
};

wfc._array = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + arg.buffer.byteLength,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setInt32(dataView.offset, this.value.buffer.byteLength);
            dataView.offset += 4;
            new Uint8Array(this.value.buffer, 0, this.value.buffer.byteLength).forEach(new function (byte) {
                dataView.setUint8(dataView.offset, byte);
                dataView.offset += 1;
            });
        }
    };
};

wfc._arrayOptional = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return arg.buffer.byteLength;
            }
        })(),
        optional: true,
        _marshallArg: function (dataView) {
            if (this.value == null) {
                dataView.setInt32(dataView.offset, 0);
                dataView.offset += 4;
            } else {
                dataView.setInt32(dataView.offset, this.value.buffer.byteLength);
                dataView.offset += 4;
                new Uint8Array(this.value.buffer, 0, this.value.buffer.byteLength).forEach(new function (byte) {
                    dataView.setUint8(dataView.offset, byte);
                    dataView.offset += 1;
                });
            }
        }
    };
};

wfc._Object = function (connection) {

    //--functions--
    /**
     * Deletes this object from the local pool of objects and notify the remote about this object's deletion.
     */
    this.delete = function () {
        this._connection._objects.remove(this._id);
        this._connection._marshall(this._id, 0, []);//opcode 0 is reserved for deletion
        delete this._id;
    };

    /**
     * Post an error to the remote.
     *
     * @param {Number} errorCode an integer error code
     * @param {String} errorMsg the error message
     */
    this.postError = function (errorCode, errorMsg) {
        this._connection._marshall(this._id, 255, [wfc._int(errorCode), wfc._string(errorMsg)]);//opcode 255 is reserved for error
    };

    //--constructor--
    this._connection = connection;
};

wfc.Connection = function (socketUrl) {

    //--properties--
    let nextId = 1;

    /**
     * Pool of objects that live on this connection.
     * Key: Number, Value: a subtype of wf._Object with wf._Object._id === Key
     *
     * @type {Map}
     * @private
     */
    this._objects = new Map();

    //--functions--
    this._unmarshallArg = function (wireMsg) {
        let typeAscii = wireMsg.getUint8(wireMsg.offset);
        wireMsg.offset += 1;

        const optional = String.fromCharCode(typeAscii) === "?";
        if (optional) {
            typeAscii = wireMsg.getUint8(wireMsg.offset);
            wireMsg.offset += 1;
        }

        let arg = null;
        switch (String.fromCharCode(typeAscii)) {
            case "i"://integer {Number}
                arg = wireMsg.getInt32(wireMsg.offset);
                wireMsg.offset += 4;
                break;
            case "f"://float {Number}
                arg = wireMsg.getFloat32(wireMsg.offset);
                wireMsg.offset += 4;
                break;
            case "o"://existing object, subtype of {wf._Object}
                const objectId = wireMsg.getUint32(wireMsg.offset);
                wireMsg.offset += 4;
                if (optional && objectId === 0) {
                    arg = null;
                } else {
                    arg = this._objects.get(objectId);
                }
                break;
            case "n":///new object, subtype of {wf._Object}
                const newObjectId = wireMsg.getUint32(wireMsg.offset);
                wireMsg.offset += 4;
                if (optional && newObjectId === 0) {
                    arg = null;
                } else {
                    const typeNameSize = wireMsg.getUint8(wireMsg.offset);
                    wireMsg.offset += 1;
                    const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, typeNameSize);
                    wireMsg.offset += typeNameSize;

                    const type = String.fromCharCode.apply(null, byteArray);
                    const newObject = new wfc[type](this);
                    newObject._id = newObjectId;
                    this._objects.set(newObject._id, newObject);
                    arg = newObject;
                }
                break;
            case "s"://{String}
                const stringSize = wireMsg.getInt32(wireMsg.offset);
                wireMsg.offset += 4;
                if (optional && stringSize === 0) {
                    arg = null;
                }
                else {
                    const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, stringSize);
                    wireMsg.offset += stringSize;
                    arg = String.fromCharCode.apply(null, byteArray);
                }
                break;
            case "a"://{Uint8Array}
                const arraySize = wireMsg.getInt32(wireMsg.offset);
                wireMsg.offset += 4;
                if (optional && arraySize === 0) {
                    arg = null;
                } else {
                    const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, arraySize);
                    wireMsg.offset += arraySize;
                    arg = byteArray;
                }
                break;
        }

        if (arg == null) {
            //TODO throw unmarshalling exception
        }

        return arg;
    };

    /**
     *
     * @param {ArrayBuffer} message
     * @private
     */
    this._unmarshall = function (message) {
        //example wire message
        //[00 00 00 03] [01] [6e 00 07 03 66 6f 6f] [69 00 00 04 00] [61 00 00 00 03 ef fa 7e]
        //translates to:
        //3 (=id),1 (=opcode),n (=new object id) 7 (id value) 3 (object name lenght) foo (object type), i (integer) 1024 (integer value), a (array) 3 (array size) [0xef 0xfa 0x7e] (array value)

        //TODO convert blob to message;
        //TODO interpret message => find object & invoke it's function
        const wireMsg = new DataView(message);
        wireMsg.offset = 0;

        const id = wireMsg.getUint32(wireMsg.offset);
        wireMsg.offset += 4;

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
        //all subsequent message will be in the binary wire format.
        socket.send(JSON.stringify({
            id: "client1"
        }));
    };

    this._onSocketClose = function (event) {

    };

    this._onSocketError = function (event) {

    };

    this._onSocketMessage = function (event) {
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

    this._marshall = function (id, opcode, argsArray) {
        //determine required wire message length
        let size = 4 + 1;  //id+opcode
        argsArray.forEach(function (arg) {
            if (arg.optional) {
                size += 1; //add one for the optional (=?) ascii char
            }
            size += 1; //add one for the ascii char
            size += arg.size; //add size of the actual argument values
        });

        const wireMsgBuffer = new ArrayBuffer(size);
        const wireMsgView = new DataView(wireMsgBuffer);
        wireMsgView.offset = 0;

        //write actual wire message
        wireMsgView.setUint32(offset, id);//id
        wireMsgView.offset += 4;
        wireMsgView.setUint8(offset, opcode);//opcode
        wireMsgView.offset += 1;

        argsArray.forEach(function (arg) {
            if (arg.optional) {
                wireMsgView.setUint8(wireMsgView.offset, "?".codePointAt(0)); //optional ascii char
                wireMsgView.offset += 1;
            }
            wireMsgView.setUint8(wireMsgView.offset, arg.type.codePointAt(0)); //argument type ascii char
            wireMsgView.offset += 1;
            arg._marshallArg(wireMsgView); //write actual argument value to buffer
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

    this._registerObject = function (object) {
        /*
         * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
         * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
         */
        object._id = nextId;
        this._objects.set(object._id, object);
        nextId++;
    };

    //--constructor--
    const socket = this._setupSocket(new WebSocket(socketUrl, "westfield"));
    //registry will be defined by the protocol generator
    this.registry = new wfc.Registry();
    this._registerObject(this.registry);
};

//make this module available in both nodejs & browser
(function() {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
        module.exports = wfc;
    else
        window.wfc = wfc;
})();
