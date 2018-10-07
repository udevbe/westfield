/*
MIT License

Copyright (c) 2017 Erik De Rijcke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @param {number}consumption
   * @private
   */
  static _checkMessageSize (wireMsg, consumption) {
    if (wireMsg.consumed + consumption > wireMsg.size) {
      throw new Error(`Request too short.`)
    } else {
      wireMsg.consumed += consumption
    }
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @returns {number}
   */
  u (wireMsg) { // unsigned integer {number}
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)

    const arg = new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += argSize

    return arg
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @returns {number}
   */
  i (wireMsg) { // integer {number}
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)

    const arg = new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += argSize
    return arg
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @returns {number}
   */
  f (wireMsg) { // float {number}
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    const arg = new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += argSize
    return new Fixed(arg >> 0)
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @param {Boolean} optional
   * @returns {Resource}
   */
  o (wireMsg, optional) {
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    const arg = new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += argSize
    if (optional && arg === 0) {
      return null
    } else {
      return this._resources[arg]
    }
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @returns {number}
   */
  n (wireMsg) {
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    const arg = new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += argSize
    return arg
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @param {Boolean} optional
   * @returns {String}
   */
  s (wireMsg, optional) { // {String}
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    const stringSize = new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += 4
    if (optional && stringSize === 0) {
      return null
    } else {
      const alignedSize = ((stringSize + 3) & ~3)
      Client._checkMessageSize(wireMsg, alignedSize)
      const byteArray = new Uint8Array(wireMsg.buffer, wireMsg.bufferOffset, stringSize)
      wireMsg.bufferOffset += alignedSize
      return String.fromCharCode.apply(null, byteArray)
    }
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @param {Boolean} optional
   * @returns {ArrayBuffer}
   */
  a (wireMsg, optional) {
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    const arraySize = new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0]
    wireMsg.bufferOffset += 4
    if (optional && arraySize === 0) {
      return null
    } else {
      const alignedSize = ((arraySize + 3) & ~3)
      Client._checkMessageSize(wireMsg, alignedSize)
      const arg = wireMsg.buffer.slice(wireMsg.bufferOffset, wireMsg.bufferOffset + arraySize)
      wireMsg.bufferOffset += alignedSize
      return arg
    }
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} wireMsg
   * @returns {number}
   */
  h (wireMsg) { // file descriptor {number}
    const argSize = 4
    Client._checkMessageSize(wireMsg, argSize)
    if (wireMsg.fds.length) {
      return wireMsg.fds.shift()
    } else {
      throw new Error('File descriptor expected.')
    }
  }

  /**
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}} message
   * @param {string} argsSignature
   * @returns {Array<*>}
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
   * @param {{buffer: ArrayBuffer, fds: Array<number>}}wireMsg a single wire message event.
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
    // const totalBufferLength = this._outMessages.reduce((previous, current) => {
    //   return previous + current.buffer.byteLength
    // }, 0)
    // let offset = 0
    // const wireMessages = new Uint8Array(new ArrayBuffer(totalBufferLength))
    //
    // this._outMessages.forEach((wireMessage) => {
    //   wireMessages.set(new Uint8Array(wireMessage.buffer), offset)
    //   offset += wireMessage.buffer.byteLength
    // })

    this.onFlush(this._outMessages)
    this._outMessages = []
  }

  /**
   * Callback when this connection wishes to send data to the other end. This callback can be used to send the given
   * array buffers using any transport mechanism.
   * @param {Array<{buffer: ArrayBuffer, fds: Array<number>}>}wireMessages
   */
  onFlush (wireMessages) {}

  /**
   * Handle a received message from a client.
   * @param {{buffer: ArrayBuffer, fds: Array<number>}} incomingWireMessages
   * @return {Promise<void>}
   * @throws Error If an illegal client request is received ie. bad length or missing file descriptor.
   */
  async message (incomingWireMessages) {
    if (!this._display) {
      // client destroyed
      return
    }

    incomingWireMessages.bufferOffset = 0

    this._inMessages.push(incomingWireMessages)
    if (this._inMessages.length > 1) {
      // more than one message in queue means the message loop is in await, don't concurrently process the new
      // message, instead return early and let the resume-from-await pick up the newly queued message.
      return
    }

    while (this._inMessages.length) {
      const wireMessages = this._inMessages[0]
      while (wireMessages.bufferOffset < wireMessages.buffer.byteLength) {
        const id = new Uint32Array(wireMessages.buffer, wireMessages.bufferOffset)[0]
        const bufu16 = new Uint16Array(wireMessages.buffer, wireMessages.bufferOffset + 4)
        wireMessages.size = bufu16[1]
        if (wireMessages.size > wireMessages.buffer.byteLength) {
          throw new Error('Request buffer too small')
        }

        const opcode = bufu16[0]
        const resource = this._resources[id]
        if (resource) {
          wireMessages.bufferOffset += 8
          wireMessages.consumed = 8
          await resource[opcode](wireMessages)
          if (!this._display) {
            // client destroyed
            return
          }
        }
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

    this._outMessages = null
    this._inMessages = null
    this.displayResource = null
    this._resources = null
    this._display = null
    this._destroyedResolver()
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
    this.displayResource.deleteId(resource.id)
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {number} size
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}>} argsArray
   * @private
   */
  __marshallMsg (id, opcode, size, argsArray) {
    /**
     * @type {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}}
     */
    const wireMsg = {
      buffer: new ArrayBuffer(size),
      fds: [],
      bufferOffset: 0
    }

    // write actual wire message
    const bufu32 = new Uint32Array(wireMsg.buffer)
    const bufu16 = new Uint16Array(wireMsg.buffer)
    bufu32[0] = id
    bufu16[2] = opcode
    bufu16[3] = size
    wireMsg.bufferOffset = 8

    argsArray.forEach((arg) => {
      arg._marshallArg(wireMsg) // write actual argument value to buffer
    })

    this.onSend(wireMsg)
  }

  /**
   * @param {number} id
   * @param {number} opcode
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}>} argsArray
   * @return {number}
   */
  marshallConstructor (id, opcode, argsArray) {
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
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}>} argsArray
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
     * @type {function():void}
     * @private
     */
    this._destroyedResolver = null
    /**
     * @type {Promise<void>}
     * @private
     */
    this._destroyPromise = new Promise((resolve) => {
      this._destroyedResolver = resolve
    })
    /**
     * @type {DisplayResource}
     */
    this.displayResource = new DisplayResource(this, 1, 0)
    this.displayResource.implementation = this
    /**
     * @type {Array<{buffer: ArrayBuffer, fds: Array<number>}>}
     * @private
     */
    this._outMessages = []
    /**
     * @type {Array<{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}>}
     * @private
     */
    this._inMessages = []
  }
}

module.exports = Client