//TODO wire protocol parser & handler

//define westfield namespace as wf
const wf = wf || {};

//-- js argument to wire format literals: integer (number), float (number), object (wf._Object), new object (wf._Object), string (string), array (ArrayBuffer) --
/**
 *
 * @param {Number} arg
 * @returns {{value: number, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._int = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setInt32(offset, this.value);
        }
    };
};

/**
 *
 * @param {Number} arg
 * @returns {{value: number, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._intOptional = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: true,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (arg == null) {
                dataView.setInt32(offset, 0);
            } else {
                dataView.setInt32(offset, this.value);
            }
        }
    }
};

/**
 *
 * @param {Number} arg
 * @returns {{value: number, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._float = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setFloat32(offset, this.value);
        }
    };
};

/**
 *
 * @param {Number} arg
 * @returns {{value: number, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._floatOptional = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: true,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (arg == null) {
                dataView.setFloat32(offset, 0);
            }
            else {
                dataView.setFloat32(offset, this.value);
            }
        }
    };
};

/**
 *
 * @param {wf._Object} arg
 * @returns {{value: wf._Object, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._object = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 2,
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setUint16(offset, this.value._id);
        }
    };
};

/**
 *
 * @param {wf._Object} arg
 * @returns {{value: wf._Object, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._objectOptional = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 2,
        optional: true,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (arg == null) {
                dataView.setUint16(offset, 0);
            } else {
                dataView.setUint16(offset, this.value._id);
            }
        }
    };
};

/**
 *
 * @param {wf._Object} arg
 * @returns {{value: wf._Object, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._newObject = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 2 + 1 + (typeof arg).length,//id+length+name
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setUint16(offset, this.value._id);
            let writeOffset = offset + 2;
            const objType = (typeof this.value);
            dataView.setUint8(writeOffset, objType.length);
            writeOffset += 1;
            objType.forEach(new function (char) {
                dataView.setUint8(writeOffset, char.codePointAt(0));
                writeOffset += 1;
            });
        }
    };
};

/**
 *
 * @param {wf._Object} arg
 * @returns {{value: wf._Object, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._newObjectOptional = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 2 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return 1 + (typeof arg).length;
            }
        })(),//id+length+name
        optional: true,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (this.value == null) {
                dataView.setUint16(offset, 0);
            } else {
                dataView.setUint16(offset, this.value._id);
                let writeOffset = offset + 2;
                const objType = (typeof this.value);
                dataView.setUint8(writeOffset, objType.length);
                writeOffset += 1;
                objType.forEach(new function (char) {
                    dataView.setUint8(writeOffset, char.codePointAt(0));
                    writeOffset += 1;
                });
            }
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: String, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._string = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + arg.length,
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setInt32(offset, this.value.length);
            let writeOffset = offset + 4;
            this.value.forEach(new function (char) {
                dataView.setUint8(writeOffset, char.codePointAt(0));
                writeOffset += 1;
            });
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: String, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._stringOptional = function (arg) {
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
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (this.value == null) {
                dataView.setInt32(offset, 0);
            } else {
                dataView.setInt32(offset, this.value.length);
                let writeOffset = offset + 4;
                this.value.forEach(new function (char) {
                    dataView.setUint8(writeOffset, char.codePointAt(0));
                    writeOffset += 1;
                });
            }
        }
    };
};

/**
 *
 * @param {TypedArray} arg
 * @returns {{value: TypedArray, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._array = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + arg.buffer.byteLength,
        optional: false,
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            dataView.setInt32(offset, this.value.buffer.byteLength);
            let writeOffset = offset + 4;
            new Uint8Array(this.value.buffer, 0, this.value.buffer.byteLength).forEach(new function (byte) {
                dataView.setUint8(writeOffset, byte);
                writeOffset += 1;
            });
        }
    };
};

/**
 *
 * @param {TypedArray} arg
 * @returns {{value: ArrayBuffer, type: string, size: number, optional: boolean, marshallTo: marshallTo}}
 * @private
 */
wf._arrayOptional = function (arg) {
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
        /**
         *
         * @param {DataView} dataView
         * @param {Number} offset
         */
        marshallTo: function (dataView, offset) {
            if (this.value == null) {
                dataView.setInt32(offset, 0);
            } else {
                dataView.setInt32(offset, this.value.buffer.byteLength);
                let writeOffset = offset + 4;
                new Uint8Array(this.value.buffer, 0, this.value.buffer.byteLength).forEach(new function (byte) {
                    dataView.setUint8(writeOffset, byte);
                    writeOffset += 1;
                });
            }
        }
    };
};

/**
 *
 * @param {wf.Connection} connection
 * @private
 */
wf._Object = function (connection) {

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
        this._connection._marshall(this._id, 255, [wf._int(errorCode), wf._string(errorMsg)]);//opcode 255 is reserved for error
    };

    //--constructor--
    this._connection = connection;
};

wf.Connection = function (socketUrl) {

    //--properties--
    /**
     * Pool of objects that live on this connection.
     * Key: Number, Value: a subtype of wf._Object with wf._Object._id === Key
     *
     * @type {Map}
     * @private
     */
    this._objects = new Map();

    //--functions--
    /**
     *
     * @param {DataView} wireMsg
     * @returns {*}
     * @private
     */
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
                const id = wireMsg.getUint16(wireMsg.offset);
                wireMsg.offset += 2;
                if (optional && id === 0) {
                    arg = null;
                } else {
                    arg = this._objects.get(id);
                }
                break;
            case "n":///new object, subtype of {wf._Object}
                const id = wireMsg.getUint16(wireMsg.offset);
                wireMsg.offset += 2;
                if (optional && id === 0) {
                    arg = null;
                } else {
                    const typeNameSize = wireMsg.getUint8(wireMsg.offset);
                    wireMsg.offset += 1;
                    const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, typeNameSize);
                    wireMsg.offset += typeNameSize;

                    const type = String.fromCharCode.apply(null, byteArray);
                    const newObject = new wf[type](this);
                    newObject._id = id;
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
        //[00 03] [01] [6e 00 07 03 66 6f 6f] [69 00 00 04 00] [61 00 00 00 03 ef fa 7e]
        //translates to:
        //3 (=id),1 (=opcode),n (=new object id) 7 (id value) 3 (object name lenght) foo (object type), i (integer) 1024 (integer value), a (array) 3 (array size) [0xef 0xfa 0x7e] (array value)

        //TODO convert blob to message;
        //TODO interpret message => find object & invoke it's function
        const wireMsg = new DataView(message);
        wireMsg.offset = 0;

        const id = wireMsg.getUint16(wireMsg.offset);
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
        //all subsequent message will be in the binary wire format.
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
        wireMsgView.setUint16(offset, id);//id
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
