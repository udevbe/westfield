'use strict'

const DisplayResource = require('./DisplayResource')
const DisplayRequests = require('./DisplayRequests')
const SyncCallbackResource = require('./SyncCallbackResource')
const Fixed = require('./Fixed')

/**
 * Represents a client connection.
 * @implements DisplayRequests
 */
class Client extends DisplayRequests {
  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  u (wireMsg) { // unsigned integer {number}
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  i (wireMsg) { // integer {number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  f (wireMsg) { // float {number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return new Fixed(arg >> 0)
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {Boolean} optional
   * @returns {Resource}
   */
  o (wireMsg, optional) {
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    if (optional && arg === 0) {
      return null
    } else {
      return this._resources[arg]
    }
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  n (wireMsg) {
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
  s (wireMsg, optional) { // {String}
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
  a (wireMsg, optional) {
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
   */
  unmarshallArgs (message, argsSignature) {
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
   * This doesn't actually send the message, but queues it so it can be send on flush.
   * @param {ArrayBuffer}wireMsg a single wire message event.
   */
  onSend (wireMsg) {
    if (!this._display) {
      // client destroyed
      return
    }
    this._outMessages.push(wireMsg)
  }

  /**
   * Empty the queue of wire messages and send them to the other end.
   */
  flush () {
    if (!this._display) {
      // client destroyed
      return
    }

    if (this._outMessages.length === 0) {
      return
    }
    const totalLength = this._outMessages.reduce((previous, current) => {
      return previous + current.byteLength
    }, 0)
    let offset = 0
    const wireMessages = new Uint8Array(new ArrayBuffer(totalLength))

    this._outMessages.forEach((wireMessage) => {
      wireMessages.set(new Uint8Array(wireMessage), offset)
      offset += wireMessage.byteLength
    })

    this.onFlush(wireMessages.buffer)
    this._outMessages = []
  }

  /**
   * Callback when this connection wishes to send data to the other end. This callback can be used to send the given
   * array buffers using any transport mechanism.
   * @param {ArrayBuffer}wireMessages
   */
  onFlush (wireMessages) {}

  /**
   * Handle a received message from a client.
   * @param {ArrayBuffer} incomingWireMessages
   * @return {Promise<void>}
   */
  async message (incomingWireMessages) {
    if (!this._display) {
      // client destroyed
      return
    }

    this._inMessages.push(incomingWireMessages)
    if (this._inMessages.length > 1) {
      // more than one message in queue means the message loop is in await, don't concurrently process the new
      // message, instead return early and let the await pick up the newly queued message.
      return
    }

    while (this._inMessages.length) {
      const wireMessages = this._inMessages[0]
      let offset = 0
      while (offset < wireMessages.byteLength) {
        if (!this._display) {
          // client destroyed
          return
        }

        const id = new Uint32Array(wireMessages, offset)[0]
        const bufu16 = new Uint16Array(wireMessages, offset + 4)
        const size = bufu16[0]
        const opcode = bufu16[1]
        const resource = this._resources[id]
        if (resource) {
          wireMessages.readIndex = offset + 8
          await resource[opcode](wireMessages)
        }
        offset += size
      }
      this._inMessages.shift()
    }
  }

  close () {
    if (!this._display) {
      // client destroyed
      return
    }

    Object.values(this._resources).forEach((resource) => {
      resource.destroy()
    })

    this.flush()

    this._destroyedResolver()
    this._destroyedResolver = null
    this._outMessages = null
    this._displayResource = null
    this._resources = null
    this._display = null
  }

  /**
   *
   * @returns {Promise<void>}
   */
  onClose () {
    return this._destroyPromise
  }

  /**
   *
   * @param {Resource} resource
   */
  registerResource (resource) {
    if (!this._display) {
      // client destroyed
      return
    }
    this._resources[resource.id] = resource
  }

  /**
   *
   * @param {Resource} resource
   */
  unregisterResource (resource) {
    if (!this._display) {
      // client destroyed
      return
    }
    delete this._resources[resource.id]
    this._displayResource.deleteId(resource.id)
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {number} size
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function(ArrayBuffer):void}>} argsArray
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
   * @param {number} id
   * @param {number} opcode
   * @param {string} itfName
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function(ArrayBuffer):void}>} argsArray
   */
  marshallConstructor (id, opcode, itfName, argsArray) {
    // get next server id
    const objectId = this._display.nextId
    this._display.nextId++

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
  }

  /**
   * @param {DisplayResource}resource
   * @param {number}id
   * @override
   */
  sync (resource, id) {
    const syncCallbackResource = new SyncCallbackResource(resource.client, id, 1)
    syncCallbackResource.done(++this._syncEventSerial)
    syncCallbackResource.destroy()
  }

  /**
   * @param {DisplayResource}resource
   * @param {number}id
   * @override
   */
  getRegistry (resource, id) {
    this._display.registry.publishGlobals(this._display.registry.createRegistryResource(this, id))
  }

  /**
   *
   * @param {Display} display
   */
  constructor (display) {
    super()
    /**
     * @type {Object.<number, Resource>}
     * @private
     */
    this._resources = {}
    /**
     * @type {Display}
     * @private
     */
    this._display = display
    /**
     * @type {number}
     * @private
     */
    this._syncEventSerial = 0
    /**
     * @type {Promise<Client>}
     * @private
     */
    this._destroyPromise = new Promise((resolve) => {
      this._destroyedResolver = resolve
    })
    /**
     * @type {DisplayResource}
     * @private
     */
    this._displayResource = new DisplayResource(this, 1, 0, this)
    /**
     * @type {Array<ArrayBuffer>}
     * @private
     */
    this._outMessages = []
    /**
     * @type {Array<ArrayBuffer>}
     * @private
     */
    this._inMessages = []
  }
}

module.exports = Client