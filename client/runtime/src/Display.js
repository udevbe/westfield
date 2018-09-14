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

const SyncCallbackProxy = require('./SyncCallbackProxy')
const RegistryProxy = require('./RegistryProxy')
const Fixed = require('./Fixed')
const {newObject} = require('./WireFormat')

class Display extends Proxy {
  constructor () {
    // Proxy expects a display object as super arg. We can't do that here so we set it immediately afterwards.
    // This is mostly to make our connection object be in line of a general WObject layout as the connection object
    // is a special case as it's the core root object.
    super(null)
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
    /**
     * @type {Display}
     */
    this.display = this
    /**
     * @type {Display}
     */
    this.implementation = this
    /**
     * @type {Object.<number,Proxy>}
     * @private
     */
    this._proxies = {}
    /**
     * @type {number}
     */
    this.nextId = 1
    this._registerObject(this)
    /**
     * @type {Promise<void>}
     * @private
     */
    this._destroyPromise = new Promise((resolve) => {
      this._destroyedResolver = resolve
    })
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  u (wireMsg) { // unsigned integer {Number}
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  i (wireMsg) { // integer {Number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return arg
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {number}
   */
  f (wireMsg) { // float {Number}
    const arg = new Int32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    return new Fixed(arg >> 0)
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {boolean} optional
   * @returns {Proxy}
   */
  o (wireMsg, optional) {
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    if (optional && arg === 0) {
      return null
    } else {
      return this._proxies.get(arg)
    }
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @returns {function(string):Proxy}
   */
  n (wireMsg) {
    const arg = new Uint32Array(wireMsg, wireMsg.readIndex, 1)[0]
    wireMsg.readIndex += 4
    const connection = this
    return (constructor) => {
      const newProxy = new constructor(this)
      newProxy._id = arg
      connection._proxies.set(newProxy._id, newProxy)
      return newProxy
    }
  }

  /**
   *
   * @param {ArrayBuffer} wireMsg
   * @param {boolean} optional
   * @returns {string|null}
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
   * @returns {ArrayBuffer|null}
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
   * @returns {Array<*>}
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
   * Should be called when data arrives from the remote end. This is needed to drive the whole rpc mechanism.
   *
   * @param {ArrayBuffer} incomingWireMessages
   */
  async unmarshall (incomingWireMessages) {
    if (this.display === null) {
      // display is closed
      return
    }

    this._inMessages.push(incomingWireMessages)
    if (this._inMessages.length > 1) {
      // more than one message in queue means the message loop is in await, don't concurrently process the new
      // message, instead return early and let the resume-from-await pick up the newly queued message.
      return
    }

    while (this._inMessages.length) {
      const wireMessages = this._inMessages[0]
      let offset = 0
      while (offset < wireMessages.byteLength) {
        const id = new Uint32Array(wireMessages, offset)[0]
        const bufu16 = new Uint16Array(wireMessages, offset + 4)
        const size = bufu16[0]
        const opcode = bufu16[1]
        const proxy = this._proxies[id]
        if (proxy) {
          wireMessages.readIndex = offset + 8
          await proxy[opcode](wireMessages)
          if (this.display === null) {
            // display is closed
            return
          }
        }
        offset += size
      }
      this._inMessages.shift()
    }
  }

  /**
   * @param {number}id
   * @param {number}opcode
   * @param {number}size
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function (ArrayBuffer):void}>}argsArray
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
   * @param {function} proxyConstructor
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function (ArrayBuffer):void}>}argsArray
   */
  marshallConstructor (id, opcode, proxyConstructor, argsArray) {
    // construct new object
    const proxy = new proxyConstructor(this)
    this._registerObject(proxy)

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(function (arg) {
      if (arg.type === 'n') {
        arg.value = proxy
      }

      size += arg.size // add size of the actual argument values
    })

    this.__marshallMsg(id, opcode, size, argsArray)

    return proxy
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function (ArrayBuffer):void}>}argsArray
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
   * Close the connection to the remote host. All objects will be deleted before the connection is closed.
   */
  close () {
    this._outMessages = null
    this._inMessages = null
    this._proxies = null
    this.display = null
    this.implementation = null
    this._destroyedResolver()
  }

  /**
   * @returns {Promise<void>}
   */
  onClose () {
    return this._destroyPromise
  }

  /**
   * @param {ArrayBuffer}wireMsg
   * @private
   */
  _onSend (wireMsg) {
    this._outMessages.push(wireMsg)
  }

  /**
   * Empty the queue of wire messages and send them to the other end.
   */
  flush () {
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
   *
   * @param {Proxy} object
   * @private
   */
  _registerObject (object) {
    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existant object
     */
    object.id = this.nextId
    this._proxies[object.id] = object
    this.nextId++
  }

  /**
   * @param {Proxy}proxy
   * @private
   */
  _deleteObject (proxy) {
    delete this._proxies[proxy.id]
  }

  /**
   * @return {RegistryProxy}
   */
  getRegistry () {
    // createRegistry -> opcode 1
    return this.display.marshallConstructor(this.id, 1, RegistryProxy.constructor, [newObject()])
  }

  /**
   * Flush and resolve once all requests have been processed by the server.
   * @return {Promise<number>}
   */
  async roundtrip () {
    return new Promise((resolve) => {
      const syncCallback = this.sync()
      syncCallback.listener = resolve
      this.flush()
    })
  }

  /**
   * @param {Proxy}proxy
   * @param {number}code
   * @param {string}message
   */
  error (proxy, code, message) {}

  /**
   * @param {number}id
   * @private
   */
  _deleteId (id) {
    // We don't do object recycling, so ignore this event
  }

  /**
   * @return {SyncCallbackProxy}
   */
  sync () {
    return this.display.marshallConstructor(this.id, 0, SyncCallbackProxy.constructor, [newObject()])
  }

  /**
   * opcode 0 -> error
   *
   * @param {ArrayBuffer} message
   */
  [0] (message) {
    const args = this.client.unmarshallArgs(message, 'ous')
    this.close()
    this.implementation.error(this, ...args)
  }

  /**
   * opcode 1 -> deleteId
   *
   * @param {ArrayBuffer} message
   */
  [0] (message) {
    this.close()
    const args = this.client.unmarshallArgs(message, 'u')
    this.implementation._deleteId(this, ...args)
  }
}

Display.name = Display.constructor.name
module.exports = Display
