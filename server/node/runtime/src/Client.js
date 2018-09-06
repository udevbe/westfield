'use strict'

const DisplayResource = require('./DisplayResource')
const Fixed = require('./Fixed')

/**
 * Represents a client connection.
 */
class Client {
  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  ['u'] (wireMsg) { // unsigned integer {number}
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  ['i'] (wireMsg) { // integer {number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  ['f'] (wireMsg) { // float {number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return new Fixed(arg >> 0)
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
   * @returns {number}
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
   * @param {ArrayBuffer}wireMsg
   * @private
   */
  _onSend (wireMsg) {
    this._queuedMessages.push(wireMsg)
  }

  /**
   * Empty the queue of wire messages and send them to the other end.
   */
  flush () {
    if (this._queuedMessages.length === 0) {
      return
    }
    const totalLength = this._queuedMessages.reduce((previous, current) => {
      return previous + current.byteLength
    }, 0)
    let offset = 0
    const wireMessages = new Uint8Array(new ArrayBuffer(totalLength))

    this._queuedMessages.forEach((wireMessage) => {
      wireMessages.set(new Uint8Array(wireMessage), offset)
      offset += wireMessage.byteLength
    })

    this.onFlush(wireMessages.buffer)
    this._queuedMessages = []
  }

  /**
   * Callback when this connection wishes to send data to the other end. This callback can be used to send the given
   * array buffers using any transport mechanism.
   * @param {ArrayBuffer}wireMessages
   */
  onFlush (wireMessages) {}

  /**
   * Handle a received message from a client.
   * @param {ArrayBuffer} wireMessages
   * @return {Promise<void>}
   */
  async message (wireMessages) {
    let offset = 0
    while (offset < wireMessages.byteLength) {
      const id = new Uint32Array(wireMessages, offset)[0]
      const bufu16 = new Uint16Array(wireMessages, offset + 4)
      const size = bufu16[0]
      const opcode = bufu16[1]
      const obj = this._objects.get(id)
      if (obj) {
        wireMessages.readIndex = offset + 8
        await obj[opcode](wireMessages)
      }
      offset += size
    }
  }

  close () {
    if (this._server) {
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
  }

  /**
   *
   * @returns {Promise.<Client>}
   */
  onClose () {
    return this._destroyPromise
  }

  /**
   *
   * @param {Resource} resource
   */
  registerResource (resource) {
    this._objects.set(resource.id, resource)
  }

  /**
   *
   * @param {Resource} resource
   */
  unregisterResource (resource) {
    this._objects.delete(resource.id)
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {number} size
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

    this._onSend(wireMsg)
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {string} itfName
   * @param {Array} argsArray
   */
  marshallConstructor (id, opcode, itfName, argsArray) {
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
   * @param {number} id
   * @param {number} opcode
   * @param {Array} argsArray
   */
  marshall (id, opcode, argsArray) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(function (arg) {
      size += arg.size // add size of the actual argument values
    })

    this.__marshallMsg(id, opcode, size, argsArray)
  };

  /**
   *
   * @param {Server} server
   */
  constructor (server) {
    /**
     * @type {Map<any, any>}
     * @private
     */
    this._objects = new Map()
    /**
     * @type {Server}
     * @private
     */
    this._server = server
    /**
     * @type {Promise<Client>}
     * @private
     */
    this._destroyPromise = new Promise((resolve) => {
      this._destroyedResolver = resolve
    })

    const displayResource = new DisplayResource(this, 1, 1)
    displayResource.implementation.getRegistry = (resource, id) => {
      this._server.registry.publishGlobals(this._server.registry.createRegistryResource(this, id))
    }
    /**
     * @type {Array<ArrayBuffer>}
     * @private
     */
    this._queuedMessages = []
  }
}

module.exports = Client