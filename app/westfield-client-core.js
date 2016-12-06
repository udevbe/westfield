//westfield client namespace
const wfc = {};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
wfc._newObject = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 4 + 1 + arg.iface.name.length,//id+length+name
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value._id);
            dataView.offset += 4;
            const objType = this.value.iface.name;
            dataView.setUint8(dataView.offset, objType.length);
            dataView.offset += 1;
            for (var i = 0, len = objType.length; i < len; i++) {
                dataView.setUint8(dataView.offset, objType[i].codePointAt(0));
                dataView.offset += 1;
            }
        }
    };
};

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
wfc._newObjectOptional = function (arg) {
    return {
        value: arg,
        type: "n",
        size: 4 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return 1 + arg.iface.name.length;
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
                const objType = this.value.iface.name;
                dataView.setUint8(dataView.offset, objType.length);
                dataView.offset += 1;
                for (var i = 0, len = objType.length; i < len; i++) {
                    dataView.setUint8(dataView.offset, objType[i].codePointAt(0));
                    dataView.offset += 1;
                }
            }
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
wfc._string = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + arg.length,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setInt32(dataView.offset, this.value.length);
            dataView.offset += 4;
            for (var i = 0, len = this.value.length; i < len; i++) {
                dataView.setUint8(dataView.offset, this.value[i].codePointAt(0));
                dataView.offset += 1;
            }
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
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
                for (let i = 0, len = this.value.length; i < len; i++) {
                    dataView.setUint8(dataView.offset, this.value[i].codePointAt(0));
                    dataView.offset += 1;
                }
            }
        }
    };
};

/**
 *
 * @param {Array} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
wfc._array = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + arg.byteLength,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value.byteLength);
            dataView.offset += 4;

            new Uint8Array(arg.buffer, 0, arg.byteLength).forEach(function (byte) {
                dataView.setUint8(dataView.offset, byte);
                dataView.offset += 1;
            });
        }
    };
};

/**
 *
 * @param {Array} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 * @private
 */
wfc._arrayOptional = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + (function () {
            if (arg == null) {
                return 0;
            } else {
                return arg.byteLength;
            }
        })(),
        optional: true,
        _marshallArg: function (dataView) {
            if (this.value == null) {
                dataView.setInt32(dataView.offset, 0);
                dataView.offset += 4;
            } else {
                dataView.setInt32(dataView.offset, this.value.byteLength);
                dataView.offset += 4;

                new Uint8Array(arg.buffer, 0, arg.byteLength).forEach(function (byte) {
                    dataView.setUint8(dataView.offset, byte);
                    dataView.offset += 1;
                });
            }
        }
    };
};

/**
 *
 * @param {WConnection} connection
 * @param {{name: String, impl: *}} iface
 * @private
 */
wfc.WObject = class {

    /**
     * Deletes this object from the local pool of objects and notify the remote about this object's deletion.
     */
    delete() {
        this._connection._objects.remove(this._id);
        this._connection._marshall(this._id, 0, []);//opcode 0 is reserved for deletion
        delete this._id;
    }

    /**
     * Post an error to the remote.
     *
     * @param {Number} errorCode an integer error code
     * @param {String} errorMsg the error message
     */
    postError(errorCode, errorMsg) {
        this._connection._marshall(this._id, 255, [wfc._int(errorCode), wfc._string(errorMsg)]);//opcode 255 is reserved for error
    }

    constructor(connection, iface) {
        Object.defineProperty(this, "_connection", {
            value: connection,
            writable: false
        });
        Object.defineProperty(this, "iface", {
            value: iface,
            writable: false
        });
    }
};

/**
 *
 * @param {String} socketUrl
 * @constructor
 */
wfc.WConnection = class {

    /**
     *
     * @param {DataView} wireMsg
     * @returns {*}
     */
    ["?".codePointAt(0)](wireMsg) {
        const nextTypeAscii = wireMsg.getUint8(wireMsg.offset);
        wireMsg.offset += 1;
        return this[nextTypeAscii](wireMsg, true);
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {Number}
     */
    ["i".codePointAt(0)](wireMsg) {//integer {Number}
        const arg = wireMsg.getInt32(wireMsg.offset);
        wireMsg.offset += 4;
        return arg;
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {Number}
     */
    ["f".codePointAt(0)](wireMsg) {//float {Number}
        const arg = wireMsg.getFloat32(wireMsg.offset);
        wireMsg.offset += 4;
        return arg;
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {WObject}
     */
    ["o".codePointAt(0)](wireMsg, optional) {
        const objectId = wireMsg.getUint32(wireMsg.offset);
        wireMsg.offset += 4;
        if (optional && objectId === 0) {
            return null;
        } else {
            return this._objects.get(objectId);
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {WObject}
     */
    ["n".codePointAt(0)](wireMsg, optional) {
        const newObjectId = wireMsg.getUint32(wireMsg.offset);
        wireMsg.offset += 4;
        if (optional && newObjectId === 0) {
            return null;
        } else {
            const typeNameSize = wireMsg.getUint8(wireMsg.offset);
            wireMsg.offset += 1;
            const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, typeNameSize);
            wireMsg.offset += typeNameSize;

            const type = String.fromCharCode.apply(null, byteArray);
            const newObject = new wfc[type](this);
            newObject._id = newObjectId;
            this._objects.set(newObject._id, newObject);
            return newObject;
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {String}
     */
    ["s".codePointAt(0)](wireMsg, optional) {//{String}
        const stringSize = wireMsg.getInt32(wireMsg.offset);
        wireMsg.offset += 4;
        if (optional && stringSize === 0) {
            return null;
        }
        else {
            const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.offset, stringSize);
            wireMsg.offset += stringSize;
            return String.fromCharCode.apply(null, byteArray);
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {ArrayBuffer}
     */
    ["a".codePointAt(0)](wireMsg, optional) {
        const arraySize = wireMsg.getInt32(wireMsg.offset);
        wireMsg.offset += 4;
        if (optional && arraySize === 0) {
            return null;
        } else {
            const arg = wireMsg.buffer.slice(wireMsg.offset, wireMsg.offset + arraySize);
            wireMsg.offset += arraySize;
            return arg;
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {*}
     * @private
     */
    _unmarshallArg(wireMsg) {
        const typeAscii = wireMsg.getUint8(wireMsg.offset);
        wireMsg.offset += 1;
        return this[typeAscii](wireMsg);
    }


    /**
     *
     * @param {ArrayBuffer} message
     * @returns {{obj: *, opcode: number, args: Array}}
     * @private
     */
    _unmarshall(message) {
        //example wire message
        //[00 00 00 03] [01] [6e 00 07 03 66 6f 6f] [69 00 00 04 00] [61 00 00 00 03 ef fa 7e]
        //translates to:
        //3 (=id),1 (=opcode),n (=new object id) 7 (id value) 3 (object name lenght) foo (object type), i (integer) 1024 (integer value), a (array) 3 (array size) [0xef 0xfa 0x7e] (array value)

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
    }

    /**
     *
     * @param {ArrayBuffer} event
     * @private
     */
    _onSocketOpen(event) {
        //TODO send back-end minimal required browser info (we start with screen size)
        //TODO the first request shall be a json informing the host of our properties.
        //all subsequent message will be in the binary wire format.
        this._socket.send(JSON.stringify({
            id: "client1"
        }));
    }

    _onSocketClose(event) {

    }

    _onSocketError(event) {

    }

    _onSocketMessage(event) {
        //TODO the first response shall be a json informing us of the host's properties.
        //all subsequent message will be in the binary wire format.
        const message = this._unmarshall(event);
        const obj = message.obj;
        obj[message.opcode].apply(obj, message.args);
    }

    /**
     *
     * @param {Number} id
     * @param {Number} opcode
     * @param {Array} argsArray
     * @private
     */
    _marshall(id, opcode, argsArray) {
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
        wireMsgView.setUint32(wireMsgView.offset, id);//id
        wireMsgView.offset += 4;
        wireMsgView.setUint8(wireMsgView.offset, opcode);//opcode
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

        this._socket.send(wireMsgBuffer);
    };

    /**
     * Close the connection to the remote host. All objects will be deleted before the connection is closed.
     */
    close() {
        this._objects.values().slice().forEach(function (object) {
            object.delete();
        });
        this._socket.close();
    };

    /**
     *
     * @param {WObject} object
     * @private
     */
    _registerObject(object) {
        /*
         * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
         * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
         */
        object._id = this.nextId;
        this._objects.set(object._id, object);
        this.nextId++;
    };

    constructor(socketUrl) {
        this.nextId = 1;

        /**
         * Pool of objects that live on this connection.
         * Key: Number, Value: a subtype of wfc._Object with wfc._Object._id === Key
         *
         * @type {Map}
         * @private
         */
        this._objects = new Map();

        this._socket = new WebSocket(socketUrl, "westfield");
        this._socket.onopen = this._onSocketOpen;
        this._socket.onclose = this._onSocketClose;
        this._socket.onerror = this._onSocketError;
        this._socket.onmessage = this._onSocketMessage;
        //registry will be defined by the protocol generator
        this.registry = new wfc.Registry();
        this._registerObject(this.registry);
    }
};

//make this module available in both nodejs & browser
(function () {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
        module.exports = wfc;
    else
        window.wfc = wfc;
})();
