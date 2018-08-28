'use strict'

// westfield server namespace
const wfs = {}

// TODO wire args are copied from westfield-client-core.js we might want to put them in a shared file...
wfs.Fixed = class {
  /**
   * Represent fixed as a signed 24-bit integer.
   *
   * @returns {number}
   */
  asInt () {
    return ((this._raw / 256.0) >> 0)
  }

  /**
   * Represent fixed as a signed 24-bit number with an 8-bit fractional part.
   *
   * @returns {number}
   */
  asDouble () {
    return this._raw / 256.0
  }

  /**
   * use parseFixed instead
   * @private
   * @param raw
   */
  constructor (raw) {
    this._raw = raw
  }
}

wfs.parseFixed = function (number) {
  return new wfs.Fixed((number * 256.0) >> 0)
}

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._uint = function (arg) {
  return {
    value: arg,
    type: 'u',
    size: 4,
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._uintOptional = function (arg) {
  return {
    value: arg,
    type: 'u',
    size: 4,
    optional: true,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = (arg === null ? 0 : this.value)
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._int = function (arg) {
  return {
    value: arg,
    type: 'i',
    size: 4,
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Int32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Number} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._intOptional = function (arg) {
  return {
    value: arg,
    type: 'i',
    size: 4,
    optional: true,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Int32Array(wireMsg, wireMsg.readIndex, 1)[0] = (arg === null ? 0 : this.value)
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Fixed} arg
 * @returns {{value: Fixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfs._fixed = function (arg) {
  return {
    value: arg,
    type: 'f',
    size: 4,
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Int32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value._raw
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Fixed} arg
 * @returns {{value: Fixed, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 */
wfs._fixedOptional = function (arg) {
  return {
    value: arg,
    type: 'f',
    size: 4,
    optional: true,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Int32Array(wireMsg, wireMsg.readIndex, 1)[0] = (arg === null ? 0 : this.value._raw)
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._object = function (arg) {
  return {
    value: arg,
    type: 'o',
    size: 4,
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value.id
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {WObject} arg
 * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._objectOptional = function (arg) {
  return {
    value: arg,
    type: 'o',
    size: 4,
    optional: true,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = (arg === null ? 0 : this.value.id)
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._newObject = function () {
  return {
    value: null, // id filled in by _marshallConstructor
    type: 'n',
    size: 4,
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._string = function (arg) {
  return {
    value: arg,
    type: 's',
    size: 4 + (function () {
      // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
      return (arg.length + 3) & ~3
    })(),
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value.length

      const strLen = this.value.length
      const buf8 = new Uint8Array(wireMsg, wireMsg.readIndex + 4, strLen)
      for (let i = 0; i < strLen; i++) {
        buf8[i] = this.value[i].codePointAt(0)
      }
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {String} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._stringOptional = function (arg) {
  return {
    value: arg,
    type: 's',
    size: 4 + (function () {
      if (arg === null) {
        return 0
      } else {
        // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
        return (arg.length + 3) & ~3
      }
    })(),
    optional: true,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      if (this.value === null) {
        new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = 0
      } else {
        new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value.length

        const strLen = this.value.length
        const buf8 = new Uint8Array(wireMsg, wireMsg.readIndex + 4, strLen)
        for (let i = 0; i < strLen; i++) {
          buf8[i] = this.value[i].codePointAt(0)
        }
      }
      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {TypedArray} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._array = function (arg) {
  return {
    value: arg,
    type: 'a',
    size: 4 + (function () {
      // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
      return (arg.byteLength + 3) & ~3
    })(),
    optional: false,
    /**
     *
     * @param {ArrayBuffer} wireMsg
     * @private
     */
    _marshallArg: function (wireMsg) {
      new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value.byteLength

      const byteLength = this.value.byteLength
      new Uint8Array(wireMsg, wireMsg.readIndex + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength))

      wireMsg.readIndex += this.size
    }
  }
}

/**
 *
 * @param {Array} arg
 * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
 *
 */
wfs._arrayOptional = function (arg) {
  return {
    value: arg,
    type: 'a',
    size: 4 + (function () {
      if (arg === null) {
        return 0
      } else {
        // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
        return (arg.byteLength + 3) & ~3
      }
    })(),
    optional: true,
    _marshallArg: function (wireMsg) {
      if (this.value === null) {
        new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = 0
      } else {
        new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0] = this.value.byteLength

        const byteLength = this.value.byteLength
        new Uint8Array(wireMsg, wireMsg.readIndex + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength))
      }
      wireMsg.readIndex += this.size
    }
  }
}

// TODO unit tests

wfs.Global = class {
  /**
   *
   * @param {String} interfaceName
   * @param {Number} version
   */
  constructor (interfaceName, version) {
    this.interfaceName = interfaceName
    this.version = version
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding wfs.Resource subtype.
   *
   * @param {wfs.Client} client
   * @param {Number} id
   * @param {Number} version
   */
  bindClient (client, id, version) {
  }
}

wfs.Resource = class {
  constructor (client, id, version, implementation) {
    this.client = client
    /**
     * @type {number}
     */
    this.id = id
    /**
     * @type {number}
     */
    this.version = version
    /**
     * Arbitrary data that can be attached to the resource.
     * @type {{}}
     */
    this.userData = {}
    this.implementation = implementation
    this._destroyPromise = new Promise((resolve) => {
      this._destroyResolver = resolve
    })
    this._destroyListeners = []
    this._destroyPromise.then(() => {
      this._destroyListeners.forEach((destroyListener) => destroyListener(this))
    })

    this.client._registerResource(this)
  }

  /**
   *
   * @param {number} code
   * @param {string} msg
   */
  postError (code, msg) {
    this.client._marshall(this.id, 0, [wfs._uint(code), wfs._string(msg)])
  }

  destroy () {
    this._destroyResolver(this)
    this.client._unregisterResource(this)
  }

  addDestroyListener (destroyListener) {
    this._destroyListeners.push(destroyListener)
  }

  removeDestroyListener (destroyListener) {
    this._destroyListeners = this._destroyListeners.filter((item) => { return item !== destroyListener })
  }

  onDestroy () {
    return this._destroyPromise
  }
}

wfs.RegistryResource = class extends wfs.Resource {
  constructor (client, id, version) {
    super(client, id, version, {})
  }

  /**
   * @param {Number} name
   * @param {String} interface_
   * @param {Number} version
   */
  global (name, interface_, version) {
    this.client._marshall(this.id, 1, [wfs._uint(name), wfs._string(interface_), wfs._uint(version)])
  }

  /**
   * Notify the client that the global with the given name id is removed.
   * @param {Number} name
   */
  globalRemove (name) {
    this.client._marshall(this.id, 2, [wfs._uint(name)])
  }

  /**
   * opcode 1 -> bind
   *
   * @param {ArrayBuffer} message
   */
  [1] (message) {
    const args = this.client._unmarshallArgs(message, 'uuu')
    this.implementation._globals.get(args[0]).bindClient(this.client, args[1], args[2])
  }
}

wfs.Registry = class {
  constructor () {
    this._registryResources = []
    this._globals = new Map()
    this._nextGlobalName = 0
  }

  /**
   * Register a global to make it available to clients.
   *
   * @param {wfs.Global} global
   */
  register (global) {
    if (!('_name' in global)) {
      global._name = ++this._nextGlobalName
    }
    this._globals.set(global._name, global)
    this._registryResources.forEach(registryResource => registryResource.global(global._name, global.interfaceName, global.version))
  }

  /**
   * Unregister a global and revoke it from clients.
   *
   * @param {wfs.Global} global
   */
  unregister (global) {
    if (this._globals.remove(global._name) !== false) {
      this._registryResources.forEach(registryResource => registryResource.globalRemove(global._name))
    }
  }

  /**
   *
   * @param {wfs.RegistryResource} registryResource
   * @private
   */
  _publishGlobals (registryResource) {
    this._globals.forEach((global, name) => registryResource.global(name, global.interfaceName, global.version))
  }

  /**
   *
   * @param {Client} client
   * @param {Number} id
   * @private
   */
  _createResource (client, id) {
    const registryResource = new wfs.RegistryResource(client, id, 1)
    registryResource.implementation = this
    this._registryResources.push(registryResource)
    return registryResource
  }
}

/**
 * @type {ClientResource}
 * @property {object} implementation
 * @property {function} implementation.create_registry
 */
wfs.ClientResource = class extends wfs.Resource {
  constructor (client, id, version) {
    super(client, id, version, {
      create_registry (resource, id) {}
    })
  }

  /**
   * opcode 1 -> createRegistry
   *
   * @param {ArrayBuffer} message
   */
  [1] (message) {
    const args = this.client._unmarshallArgs(message, 'n')
    this.implementation.create_registry.call(this.implementation, this, args[0])
  }
}

/**
 * Represents a client connection.
 *
 */
wfs.Client = class {
  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {Number}
   */
  ['u'] (wireMsg) { // unsigned integer {Number}
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {Number}
   */
  ['i'] (wireMsg) { // integer {Number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {Number}
   */
  ['f'] (wireMsg) { // float {Number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return new wfs.Fixed(arg >> 0)
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {Boolean} optional
   * @returns {WObject}
   */
  ['o'] (wireMsg, optional) {
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    if (optional && arg === 0) {
      return null
    } else {
      return this._objects.get(arg)
    }
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {function}
   */
  ['n'] (wireMsg) {
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {Boolean} optional
   * @returns {String}
   */
  ['s'] (wireMsg, optional) { // {String}
    const stringSize = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    if (optional && stringSize === 0) {
      return null
    } else {
      const byteArray = new Uint8Array(wireMsg, wireMsg.readIndex, stringSize)
      wireMsg.readIndex += ((stringSize + 3) & ~3)
      return String.fromCharCode.apply(null, byteArray)
    }
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {Boolean} optional
   * @returns {ArrayBuffer}
   */
  ['a'] (wireMsg, optional) {
    const arraySize = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    if (optional && arraySize === 0) {
      return null
    } else {
      const arg = wireMsg.slice(wireMsg.readIndex, wireMsg.readIndex + arraySize)
      wireMsg.readIndex += ((arraySize + 3) & ~3)
      return arg
    }
  }

  /**
   *
   * @param {ArrayBuffer} message
   * @param {string} argsSignature
   * @returns {Array}
   * @private
   */
  _unmarshallArgs (message, argsSignature) {
    const argsSigLength = argsSignature.length
    const args = []
    let optional = false
    for (let i = 0; i < argsSigLength; i++) {
      let signature = argsSignature[i]
      optional = signature === '?'

      if (optional) {
        signature = argsSignature[++i]
      }

      args.push(this[signature](message, optional))
    }
    return args
  }

  /**
   *
   * @param {ArrayBuffer} event
   * @private
   */
  _unmarshall (buffer) {
    const bufu32 = new Uint32Array(buffer)
    const bufu16 = new Uint16Array(buffer)

    const id = bufu32[0]
    // const size = bufu16[2];//not used.
    const opcode = bufu16[3]
    buffer.readIndex = 8

    const obj = this._objects.get(id)
    if (obj) {
      obj[opcode](buffer)
    } else {
      console.error(`Object with id=${id} does not exist (opcode=${opcode}). Disconnecting client.`)
      this.close()
    }
  }

  /**
   * Sends the given wireMessage to the client over a websocket connection.
   *
   * @param {ArrayBuffer} wireMsg
   */
  onSend (wireMsg) {
  }

  /**
   * Handle a received message from a client websocket connection
   * @param {ArrayBuffer} buffer
   */
  message (buffer) {
    this._unmarshall(buffer)
  }

  close () {
    const index = this._server.clients.indexOf(this)
    if (index > -1) {
      this._destroyedResolver(this)

      this._objects.forEach((object) => {
        object.destroy()
      })
      this._objects.clear()

      this._server.clients.splice(this._server.clients.indexOf(this), 1)
      this._server = null
    }
  }

  /**
   *
   * @returns {Promise.<wfs.Client>}
   */
  onClose () {
    return this._destroyPromise
  }

  /**
   *
   * @param {wfs.Resource} resource
   * @private
   */
  _registerResource (resource) {
    this._objects.set(resource.id, resource)
  }

  /**
   *
   * @param {wfs.Resource} resource
   * @private
   */
  _unregisterResource (resource) {
    this._objects.delete(resource.id)
  }

  /**
   *
   * @param {Number} id
   * @param {Number} opcode
   * @param {Number} size
   * @param {Array} argsArray
   * @private
   */
  __marshallMsg (id, opcode, size, argsArray) {
    const wireMsg = new ArrayBuffer(size)

    // write actual wire message
    const bufu32 = new Uint32Array(wireMsg)
    const bufu16 = new Uint16Array(wireMsg)
    bufu32[0] = id
    bufu16[2] = size
    bufu16[3] = opcode
    wireMsg.readIndex = 8

    argsArray.forEach(function (arg) {
      arg._marshallArg(wireMsg) // write actual argument value to buffer
    })

    this.onSend(wireMsg)
  }

  /**
   *
   * @param {Number} id
   * @param {Number} opcode
   * @param {string} itfName
   * @param {Array} argsArray
   * @private
   */
  _marshallConstructor (id, opcode, itfName, argsArray) {
    // get next server id
    const objectId = this._server.nextId
    this._server.nextId++

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(function (arg) {
      if (arg.type === 'n') {
        arg.value = objectId
      }

      size += arg.size // add size of the actual argument values
    })

    this.__marshallMsg(id, opcode, size, argsArray)

    return objectId
  }

  /**
   *
   * @param {Number} id
   * @param {Number} opcode
   * @param {Array} argsArray
   * @private
   */
  _marshall (id, opcode, argsArray) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(function (arg) {
      size += arg.size // add size of the actual argument values
    })

    this.__marshallMsg(id, opcode, size, argsArray)
  };

  /**
   *
   * @param {wfs.Server} server
   */
  constructor (server) {
    this._objects = new Map()
    this._server = server
    this._destroyPromise = new Promise((resolve) => {
      this._destroyedResolver = resolve
    })

    const clientResource = new wfs.ClientResource(this, 1, 1)
    clientResource.implementation.create_registry = (resource, id) => {
      this._server.registry._publishGlobals(this._server.registry._createResource(this, id))
    }
  }
}

wfs.Server = class {
  constructor () {
    this._destroyListeners = []
    this.registry = new wfs.Registry()
    this.clients = []
    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
     */
    this.nextId = 0xff000000
  }

  getNextId () {
    return ++this.nextId
  }

  createClient () {
    const client = new wfs.Client(this)
    this.clients.push(client)
    return client
  }
}

module.exports = wfs
