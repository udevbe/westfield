"use strict";

//westfield client namespace
const wfc = {};

wfc.WFixed = class WFixed {

    /**
     * Represent fixed as a signed 24-bit integer.
     *
     * @returns {number}
     */
    asInt() {
        return ((this._raw / 256.0) >> 0);
    }

    /**
     * Represent fixed as a signed 24-bit number with an 8-bit fractional part.
     *
     * @returns {number}
     */
    asDouble() {
        return this._raw / 256.0;
    }

    /**
     * use parseFixed instead
     * @private
     * @param raw
     */
    constructor(raw) {
        this._raw = raw;
    }
};

wfc.parseFixed = function (number) {
    return new wfc.WFixed((number * 256.0) >> 0);
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfc._uint = function (arg) {
    return {
        value: arg,
        type: "u",
        size: 4,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value);
            dataView.offset += this.size;
        }
    };
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfc._uintOptional = function (arg) {
    return {
        value: arg,
        type: "u",
        size: 4,
        optional: true,
        _marshallArg: function (dataView) {
            if (arg == null) {
                dataView.setUint32(dataView.offset, 0);
            } else {
                dataView.setUint32(dataView.offset, this.value);
            }
            dataView.offset += this.size;
        }
    }
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
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
 *
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
 * @param {WFixed} arg
 * @returns {{value: WFixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfc._fixed = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setInt32(dataView.offset, this.value._raw);
            dataView.offset += this.size;
        }
    };
};

/**
 *
 * @param {WFixed} arg
 * @returns {{value: WFixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfc._fixedOptional = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: true,
        _marshallArg: function (dataView) {
            if (arg == null) {
                dataView.setInt32(dataView.offset, 0);
            } else {
                dataView.setInt32(dataView.offset, this.value._raw);
            }
            dataView.offset += this.size;
        }
    }
};

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
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
 *
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
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfc._newObject = function () {
    return {
        value: null, //filled in by _marshallConstructor
        type: "n",
        size: null, //filled in by _marshallConstructor
        optional: false,
        _marshallArg: function (dataView) {
            dataView.setUint32(dataView.offset, this.value._id);
            dataView.offset += 4;
            const objType = this.value.iface.name;
            dataView.setUint8(dataView.offset, objType.length);
            dataView.offset += 1;
            for (let i = 0, len = objType.length; i < len; i++) {
                dataView.setUint8(dataView.offset, objType[i].codePointAt(0));
                dataView.offset += 1;
            }
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
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
 *
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
 *
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
 *
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
 */
wfc.WObject = class {

    /**
     * Deletes this object from the local pool of objects and notify the remote about this object's deletion.
     */
    delete() {
        this._connection._objects.remove(this._id);
        this._connection._marshall(this._id, 0, []);//opcode 0 is reserved for deletion
    }

    /**
     * Post an error to the remote.
     *
     * @param {Number} errorCode an integer error code
     * @param {String} errorMsg the error message
     */
    postError(errorCode, errorMsg) {
        this._connection._marshall(this._id, 255, [wfc._uint(errorCode), wfc._string(errorMsg)]);//opcode 255 is reserved for error
    }

    /**
     *
     * @param {WConnection} connection
     * @param {*} iface
     */
    constructor(connection, iface) {
        this._connection = connection;
        this.iface = iface;
    }
};

wfc.WRegistry = class WRegistry extends wfc.WObject {
    /**
     * Bind an object to the connection.
     *
     * Binds a new, client-created object to the server using the specified name as the identifier.
     *
     * @param {Number} name unique numeric name of the object
     * @param {string} itfName class name of the new object
     * @return {*} a new bounded object
     */
    bind(name, itfName) {
        return this._connection._marshallConstructor(this._id, 1, itfName, [wfc._uint(name), wfc._newObject()]);
    }

    constructor(connection) {
        super(connection, {
            name: "WRegistry",
            version: 1,

            /**
             * Announce global object.
             *
             * Notify the client of global objects.
             * The event notifies the client that a global object with
             * the given name is now available, and it implements the
             * given version of the given interface.
             *
             * @param {Number} name numeric name of the global object
             * @param {string} interface_ interface implemented by the object
             * @param {Number} version interface version
             */
            global(name, interface_, version){
            },

            /**
             * Announce removal of global object.
             *
             * Notify the client of removed global objects.
             * This event notifies the client that the global identified
             * by name is no longer available.  If the client bound to
             * the global using the bind request, the client should now
             * destroy that object.
             *
             * The object remains valid and requests to the object will be
             * ignored until the client destroys it, to avoid races between
             * the global going away and a client sending a request to it.
             *
             * @param {Number} name
             */
            globalRemove(name){
            }
        });
    }

    [1](name, interface_, version) {
        this._iface.global(name, interface_, version);
    }

    [2](name) {
        this._iface.globalRemove(name);
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
    ["u".codePointAt(0)](wireMsg) {//unsigned integer {Number}
        const arg = wireMsg.getUint32(wireMsg.offset);
        wireMsg.offset += 4;
        return arg;
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
        const arg = new wfc.WFixed(wireMsg.getInt32(wireMsg.offset) >> 0);
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

    __marshallMsg(id, opcode, size, argsArray) {
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
    }

    /**
     *
     * @param {Number} id
     * @param {Number} opcode
     * @param {string} itfName
     * @param {Array} argsArray
     * @private
     */
    _marshallConstructor(id, opcode, itfName, argsArray) {

        //cosntruct new object
        const wObject = new wfc[itfName](this);
        this._registerObject(wObject);
        Object.freeze(wObject);

        //determine required wire message length
        let size = 4 + 1;  //id+opcode
        argsArray.forEach(function (arg) {
            if (arg.type === "n") {
                arg.value = wObject;
                arg.size = 4 + 1 + arg.value.iface.name.length;
            }

            if (arg.optional) {
                size += 1; //add one for the optional (=?) ascii char
            }
            size += 1; //add one for the ascii char
            size += arg.size; //add size of the actual argument values
        });

        this.__marshallMsg(id, opcode, size, argsArray);

        return wObject;
    };

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

        this.__marshallMsg(id, opcode, size, argsArray);
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
        this.registry = new wfc.WRegistry(this);
        this.nextId = 1;
        this._registerObject(this.registry);
        Object.freeze(this.registry);
    }
};

//make this module available in both nodejs & browser
(function () {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
        module.exports = wfc;
    else
        window.wfc = wfc;
})();
