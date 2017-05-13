"use strict";

//westfield client namespace
const wfs = {};


//TODO wire args are copied from westfield-client-core.js we might want to put them in a shared file...
wfs.Fixed = class Fixed {

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

wfs.parseFixed = function (number) {
    return new wfs.Fixed((number * 256.0) >> 0);
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._uint = function (arg) {
    return {
        value: arg,
        type: "u",
        size: 4,
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = this.value;
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._uintOptional = function (arg) {
    return {
        value: arg,
        type: "u",
        size: 4,
        optional: true,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = arg === null ? 0 : this.value;
            wireMsg.offset += this.size;
        }
    }
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._int = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Int32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = this.value;
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._intOptional = function (arg) {
    return {
        value: arg,
        type: "i",
        size: 4,
        optional: true,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Int32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = arg === null ? 0 : this.value;
            wireMsg.offset += this.size;
        }
    }
};

/**
 *
 * @param {Fixed} arg
 * @returns {{value: Fixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfs._fixed = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Int32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = this.value._raw;
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {Fixed} arg
 * @returns {{value: Fixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfs._fixedOptional = function (arg) {
    return {
        value: arg,
        type: "f",
        size: 4,
        optional: true,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Int32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = arg === null ? 0 : this.value._raw;
            wireMsg.offset += this.size;
        }
    }
};

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._object = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 4,
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = this.value._id;
            wireMsg.offset += this.size;
        }
    };
};


/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._objectOptional = function (arg) {
    return {
        value: arg,
        type: "o",
        size: 4,
        optional: true,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = arg === null ? 0 : this.value._id;
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._newObject = function () {
    return {
        value: null, //filled in by _marshallConstructor
        type: "n",
        size: 4,
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf[0] = this.value._id;
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._string = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + (function () {
            return (arg.length + 3) & ~3;
        })(),
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf32 = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf32[0] = this.value.length;

            const strLen = this.value.length;
            const buf8 = new Uint8Array(wireMsg, wireMsg.offset + 4, strLen);
            for (let i = 0; i < strLen; i++) {
                buf8[i] = this.value[i].codePointAt(0);
            }
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._stringOptional = function (arg) {
    return {
        value: arg,
        type: "s",
        size: 4 + (function () {
            if (arg === null) {
                return 0;
            } else {
                return (arg.length + 3) & ~3;
            }
        })(),
        optional: true,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf32 = new Uint32Array(wireMsg, wireMsg.offset, 1);
            if (this.value === null) {
                buf32[0] = 0;
            } else {
                buf32[0] = this.value.length;

                const strLen = this.value.length;
                const buf8 = new Uint8Array(wireMsg, wireMsg.offset + 4, strLen);
                for (let i = 0; i < strLen; i++) {
                    buf8[i] = this.value[i].codePointAt(0);
                }
            }
            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {TypedArray} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._array = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + (function () {
            return (arg.byteLength + 3) & ~3;
        })(),
        optional: false,
        /**
         *
         * @param {ArrayBuffer} wireMsg
         * @private
         */
        _marshallArg: function (wireMsg) {
            const buf32 = new Uint32Array(wireMsg, wireMsg.offset, 1);
            buf32[0] = this.value.byteLength;

            const byteLength = this.value.byteLength;
            new Uint8Array(wireMsg, wireMsg.offset + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength));

            wireMsg.offset += this.size;
        }
    };
};

/**
 *
 * @param {Array} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._arrayOptional = function (arg) {
    return {
        value: arg,
        type: "a",
        size: 4 + (function () {
            if (arg === null) {
                return 0;
            } else {
                return (arg.byteLength + 3) & ~3;
            }
        })(),
        optional: true,
        _marshallArg: function (wireMsg) {
            const buf32 = new Uint32Array(wireMsg, wireMsg.offset, 1);
            if (this.value === null) {
                buf32[0] = 0;
            } else {
                buf32[0] = this.value.byteLength;

                const byteLength = this.value.byteLength;
                new Uint8Array(wireMsg, wireMsg.offset + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength));
            }
            wireMsg.offset += this.size;
        }
    };
};

//TODO model objects after their java counterpart.

wfs.Client = class Client {

};

wfs.Global = class Global {

    /**
     *
     * @param {String} interfaceName
     * @param {Number} version
     */
    constructor(interfaceName, version) {
        this.interfaceName = interfaceName;
        this.version = version;
    }

    /**
     * Implemented by subclass
     *
     * @param {wfs.Client} client
     * @param {Number} id
     * @param {Number} version
     */
    bindClient(client, id, version) {}
};

wfs.Resource = class Resource {

    constructor(client, version, id, implementation) {
        this.client = client;
        this.version = version;
        this.id = id;
        this.implementation = implementation;

        client.registerResource(this);
    }

    destroy() {
        client.unregisterResource(this);
    }
};

wfs.RegistryResource = class RegistryResource extends wfs.Resource {

    constructor(client, id, implementation) {
        super(client, 1, id, implementation);
    }


    global(name, interface_, version) {
        //TODO construct args object & send to remote
    }

    globalRemove(name) {
        //TODO construct args object & send to remote
    }

    /**
     * opcode 1 -> bind
     *
     * @param {ArrayBuffer} message
     * @param {Map} objects
     */
    [1](message, objects) {
        const argsReader = new _ArgsReader(message, objects);
        this.implementation.bind(this, argsReader.readInt(), argsReader.readInt(), argsReader.readInt())
    }

};

wfs.Registry = class Registry {

    constructor() {
        this._registryResources = [];
        this._globals = new Map();
        this._nextGlobalName = 0;
    }

    /**
     * Bind an object to the connection.
     *
     * Binds a new, client-created object to the server using the specified name as the identifier.
     *
     * @param {wfs.RegistryResource} resource registry resource mapping a specific client
     * @param {Number} name unique numeric name of the object
     * @param {Number} id object id of the new object
     * @param {number} version The version used and supported by the client
     * @return {*} a new bounded object
     */
    bind(resource, name, id, version) {
        this.globals.get(name).bindClient(resource.client, id, version);
    }

    /**
     *
     * @param {wfs.Global} global
     */
    register(global) {
        if (global._name === null) {
            global._name = ++this._nextGlobalName;
        }
        this._globals.put(global._name, global);
        this._registryResources.forEach(registryResource => registryResource.global(global._name, global.interfaceName, global.version));
    }

    /**
     *
     * @param {wfs.Global} global
     */
    unregister(global) {
        if (this._globals.remove(global._name) !== = false) {
            this._registryResources.forEach(registryResource => registryResource.globalRemove(global._name));
        }
    }

    //TODO publishGlobals
    //TODO createResource
};


//TODO see what we can reuse from the this c/p client side connection class
/**
 *
 * @param {String} socketUrl
 * @constructor
 */
wfs.Connection = class {

    /**
     *
     * @param {DataView} wireMsg
     * @returns {Number}
     */
    ["u"](wireMsg) {//unsigned integer {Number}
        const arg = new Uint32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        return arg;
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {Number}
     */
    ["i"](wireMsg) {//integer {Number}
        const arg = new Int32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        return arg;
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {Number}
     */
    ["f"](wireMsg) {//float {Number}
        const arg = new Int32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        return new wfs.Fixed(arg >> 0);
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {WObject}
     */
    ["o"](wireMsg, optional) {
        const arg = new Uint32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        if (optional && arg === 0) {
            return null;
        } else {
            return this._objects.get(arg);
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @returns {function}
     */
    ["n"](wireMsg) {
        const arg = new Uint32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        const connection = this;
        return function (type) {
            const newObject = new wfs[type](this);
            newObject._id = arg;
            connection._objects.set(newObject._id, newObject);
            return newObject;
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {String}
     */
    ["s"](wireMsg, optional) {//{String}
        const stringSize = new Uint32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        if (optional && stringSize === 0) {
            return null;
        }
        else {
            const byteArray = new Uint8Array(wireMsg, wireMsg.offset, stringSize);
            wireMsg.offset += (stringSize + (4 - (stringSize % 4)));
            return String.fromCharCode.apply(null, byteArray);
        }
    }

    /**
     *
     * @param {DataView} wireMsg
     * @param {Boolean} optional
     * @returns {ArrayBuffer}
     */
    ["a"](wireMsg, optional) {
        const arraySize = new Uint32Array(wireMsg, wireMsg.offset, 1)[0];
        wireMsg.offset += 4;
        if (optional && arraySize === 0) {
            return null;
        } else {
            const arg = wireMsg.slice(wireMsg.offset, wireMsg.offset + arraySize);
            wireMsg.offset += (arraySize + (4 - (arraySize % 4)));
            return arg;
        }
    }

    /**
     *
     * @param {ArrayBuffer} message
     * @param {string} argsSignature
     * @returns {Array}
     * @private
     */
    _unmarshallArgs(message, argsSignature) {
        const argsSigLength = argsSignature.length;
        const args = [];
        let optional = false;
        for (let i = 0; i < argsSigLength; i++) {
            let signature = argsSignature[i];
            optional = signature === "?";

            if (optional) {
                signature = argsSignature[++i];
            }

            args.push(this[signature](message, optional));
        }
        return args;
    }


    /**
     *
     * @param {ArrayBuffer} message
     * @private
     */
    _unmarshall(message) {
        const buffer = message.data;
        const bufu32 = new Uint32Array(buffer);
        const bufu16 = new Uint16Array(buffer);

        const id = bufu32[0];
        //const size = bufu16[2];//not used.
        const opcode = bufu16[3];
        buffer.offset = 8;

        const obj = this._objects.get(id);
        obj[opcode](buffer);
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
//        this._socket.send(JSON.stringify({
//            id: "client1"
//        }));
        this._socket.binaryType = "arraybuffer";
    }

    _onSocketClose(event) {

    }

    _onSocketError(event) {

    }

    _onSocketMessage(event) {
        //TODO the first response shall be a json informing us of the host's properties.
        //all subsequent message will be in the binary wire format.
        this._unmarshall(event);
    }

    __marshallMsg(id, opcode, size, argsArray) {
        const wireMsg = new ArrayBuffer(size);

        //write actual wire message
        const bufu32 = new Uint32Array(wireMsg);
        const bufu16 = new Uint16Array(wireMsg);
        bufu32[0] = id;
        bufu16[2] = size;
        bufu16[3] = opcode;
        wireMsg.offset = 8;

        argsArray.forEach(function (arg) {
            arg._marshallArg(wireMsg); //write actual argument value to buffer
        });

        this._socket.send(wireMsg);
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
        const wObject = new wfs[itfName](this);
        this._registerObject(wObject);
        Object.freeze(wObject);

        //determine required wire message length
        let size = 4 + 2 + 2;  //id+size+opcode
        argsArray.forEach(function (arg) {
            if (arg.type === "n") {
                arg.value = wObject;
            }

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
        let size = 4 + 2 + 2;  //id+size+opcode
        argsArray.forEach(function (arg) {
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

        //FIXME separate out to an 'open' function
        this._socket = new WebSocket(socketUrl, "westfield");
        const connection = this;
        this._socket.onopen = (event) => {
            connection._onSocketOpen(event);
        };
        this._socket.onclose = (event) => {
            connection._onSocketClose(event);
        };
        this._socket.onerror = (event) => {
            connection._onSocketError(event);
        };
        this._socket.onmessage = (event) => {
            connection._onSocketMessage(event);
        };

        this.registry = new wfs.Registry(this);
        this.nextId = 1;
        this._registerObject(this.registry);
        Object.freeze(this.registry);
    }
};

//make this module available in both nodejs & browser
(function () {
    if (typeof module !== = 'undefined' && typeof module.exports !== = 'undefined')
        module.exports = wfs;
    else
        window.wfc = wfs;
})();