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

import Fixed from './Fixed'

class Connection {
  /**
   * @param {number} arg
   * @returns {{value: number, type: 'u', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   */
  static uint (arg) {
    return {
      value: arg,
      type: 'u',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {number} arg
   * @returns {{value: number, type: 'u', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static uintOptional (arg) {
    return {
      value: arg,
      type: 'u',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = (arg === null ? 0 : this.value)
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {WebFD} arg
   * @returns {{value: number, type: 'h', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static fileDescriptor (arg) {
    return {
      value: arg,
      type: 'h',
      size: 0, // file descriptors are not added to the message size because they are somewhat considered meta data.
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        wireMsg.fds.push(this.value)
      }
    }
  }

  /**
   *
   * @param {number} arg
   * @returns {{value: number, type: 'h', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static fileDescriptorOptional (arg) {
    return {
      value: arg,
      type: 'h',
      size: 0, // file descriptors are not added to the message size because they are not part of the unix socket message buffer.
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        wireMsg.fds.push(this.value)
      }
    }
  }

  /**
   *
   * @param {number} arg
   * @returns {{value: number, type: 'i', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static int (arg) {
    return {
      value: arg,
      type: 'i',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {number} arg
   * @returns {{value: number, type: 'i', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static intOptional (arg) {
    return {
      value: arg,
      type: 'i',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = (arg === null ? 0 : this.value)
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {Fixed} arg
   * @returns {{value: Fixed, type: 'f', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   */
  static fixed (arg) {
    return {
      value: arg,
      type: 'f',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value._raw
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {Fixed} arg
   * @returns {{value: Fixed, type: 'f', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   */
  static fixedOptional (arg) {
    return {
      value: arg,
      type: 'f',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Int32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = (arg === null ? 0 : this.value._raw)
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {Resource} arg
   * @returns {{value: Resource, type: 'o', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static object (arg) {
    return {
      value: arg,
      type: 'o',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value.id
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {Resource} arg
   * @returns {{value: Resource, type: 'o', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static objectOptional (arg) {
    return {
      value: arg,
      type: 'o',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = (arg === null ? 0 : this.value.id)
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   * @returns {{value: number, type: 'n', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   */
  static newObject () {
    return {
      value: 0, // id filled in by _marshallConstructor
      type: 'n',
      size: 4,
      optional: false,
      /**
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {string} arg
   * @returns {{value: string, type: 's', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static string (arg) {
    return {
      value: `${arg}\0`,
      type: 's',
      size: 4 + (function () {
        // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
        // length+1 for null terminator
        return (arg.length + 1 + 3) & ~3
      })(),
      optional: false,
      /**
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value.length

        const strLen = this.value.length
        const buf8 = new Uint8Array(wireMsg.buffer, wireMsg.bufferOffset + 4, strLen)
        for (let i = 0; i < strLen; i++) {
          buf8[i] = this.value[i].codePointAt(0)
        }
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {String} arg
   * @returns {{value: *, type: 's', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static stringOptional (arg) {
    return {
      value: `${arg}\0`,
      type: 's',
      size: 4 + (function () {
        if (arg === null) {
          return 0
        } else {
          // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
          // length+1 for null terminator
          return (arg.length + 1 + 3) & ~3
        }
      })(),
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        if (this.value === null) {
          new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = 0
        } else {
          new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value.length

          const strLen = this.value.length
          const buf8 = new Uint8Array(wireMsg.buffer, wireMsg.bufferOffset + 4, strLen)
          for (let i = 0; i < strLen; i++) {
            buf8[i] = this.value[i].codePointAt(0)
          }
        }
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {TypedArray} arg
   * @returns {{value: *, type: 'a', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static array (arg) {
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
       * @param {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value.byteLength

        const byteLength = this.value.byteLength
        new Uint8Array(wireMsg.buffer, wireMsg.bufferOffset + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength))

        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   *
   * @param {TypedArray} arg
   * @returns {{value: *, type: 'a', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}}
   *
   */
  static arrayOptional (arg) {
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
          new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = 0
        } else {
          new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = this.value.byteLength

          const byteLength = this.value.byteLength
          new Uint8Array(wireMsg.buffer, wireMsg.bufferOffset + 4, byteLength).set(new Uint8Array(this.value.buffer, 0, byteLength))
        }
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @param {number}consumption
   * @private
   */
  static _checkMessageSize (message, consumption) {
    if (message.consumed + consumption > message.size) {
      throw new Error(`Request too short.`)
    } else {
      message.consumed += consumption
    }
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @returns {number}
   */
  static u (message) { // unsigned integer {number}
    Connection._checkMessageSize(message, 4)
    return message.buffer[message.bufferOffset++]
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @returns {number}
   */
  static i (message) {
    Connection._checkMessageSize(message, 4)
    const arg = new Int32Array(message.buffer.buffer, message.buffer.byteOffset + (message.bufferOffset * Uint32Array.BYTES_PER_ELEMENT), 1)[0]
    message.bufferOffset += 1
    return arg
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @returns {Fixed}
   */
  static f (message) {
    Connection._checkMessageSize(message, 4)
    const arg = new Int32Array(message.buffer.buffer, message.buffer.byteOffset + (message.bufferOffset * Uint32Array.BYTES_PER_ELEMENT), 1)[0]
    message.bufferOffset += 1
    return new Fixed(arg >> 0)
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @param {Boolean} optional
   * @param {Connection}connection
   * @returns {WlObject}
   */
  static o (message, optional, connection) {
    Connection._checkMessageSize(message, 4)
    const arg = message.buffer[message.bufferOffset++]
    if (optional && arg === 0) {
      return null
    } else {
      const wlObject = connection.wlObjects[arg]
      if (wlObject) {
        return wlObject
      } else {
        throw new Error(`Unknown object id ${arg}`)
      }
    }
  }

  /**
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @returns {number}
   */
  static n (message) {
    Connection._checkMessageSize(message, 4)
    return message.buffer[message.bufferOffset++]
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @param {Boolean} optional
   * @returns {String}
   */
  static s (message, optional) { // {String}
    Connection._checkMessageSize(message, 4)
    const stringSize = message.buffer[message.bufferOffset++]
    if (optional && stringSize === 0) {
      return null
    } else {
      const alignedSize = ((stringSize + 3) & ~3)
      Connection._checkMessageSize(message, alignedSize)
      // size -1 to eliminate null byte
      const byteArray = new Uint8Array(message.buffer.buffer, message.buffer.byteOffset + (message.bufferOffset * Uint32Array.BYTES_PER_ELEMENT), stringSize - 1)
      message.bufferOffset += (alignedSize / 4)
      return String.fromCharCode(...byteArray)
    }
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @param {Boolean} optional
   * @returns {ArrayBuffer}
   */
  static a (message, optional) {
    Connection._checkMessageSize(message, 4)
    const arraySize = message.buffer[message.bufferOffset++]
    if (optional && arraySize === 0) {
      return null
    } else {
      const alignedSize = ((arraySize + 3) & ~3)
      Connection._checkMessageSize(message, alignedSize)
      const arg = message.buffer.buffer.slice(message.buffer.byteOffset + (message.bufferOffset * Uint32Array.BYTES_PER_ELEMENT), message.buffer.byteOffset + (message.bufferOffset * Uint32Array.BYTES_PER_ELEMENT) + arraySize)
      message.bufferOffset += alignedSize
      return arg
    }
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @returns {WebFD}
   */
  static h (message) { // file descriptor {number}
    if (message.fds.length > 0) {
      return message.fds.shift()
    } else {
      throw new Error('Not enough file descriptors in message object.')
    }
  }

  constructor () {
    /**
     * @type {Object.<number,WlObject>}
     */
    this.wlObjects = {}
    /**
     * @type {boolean}
     * @private
     */
    this.closed = false
    /**
     * @type {Array<{buffer: ArrayBuffer, fds: Array<WebFD>}>}
     * @private
     */
    this._outMessages = []
    /**
     * @type {Array<{buffer: Uint32Array, fds: Array<WebFD>}>}
     * @private
     */
    this._inMessages = []
  }

  /**
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   * @param {string} argsSignature
   * @returns {Array<*>}
   */
  unmarshallArgs (message, argsSignature) {
    const argsSigLength = argsSignature.length
    const args = []
    let optional = false
    for (let i = 0; i < argsSigLength; i++) {
      let signatureChar = argsSignature[i]
      optional = signatureChar === '?'

      if (optional) {
        signatureChar = argsSignature[++i]
      }

      args.push(Connection[signatureChar](message, optional, this.wlObjects))
    }
    return args
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {number} size
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   */
  marshallMsg (id, opcode, size, argsArray) {
    /**
     * @type {{buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}}
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

    // write actual argument value to buffer
    argsArray.forEach((arg) => arg._marshallArg(wireMsg))
    this.onSend(wireMsg)
  }

  /**
   * Handle received wire messages.
   * @param {{buffer: Uint32Array, fds: Array<WebFD>}} incomingWireMessages
   * @return {Promise<void>}
   * @throws Error If an illegal client request is received ie. bad length or missing file descriptor.
   */
  async message (incomingWireMessages) {
    if (this.closed) { return }

    this._inMessages.push(incomingWireMessages)
    // more than one message in queue means the message loop is in await, don't concurrently process the new
    // message, instead return early and let the resume-from-await pick up the newly queued message.
    if (this._inMessages.length > 1) { return }

    while (this._inMessages.length) {
      const wireMessages = /** @type {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} */this._inMessages[0]
      wireMessages.bufferOffset = 0
      wireMessages.consumed = 0
      wireMessages.size = 0
      while (wireMessages.bufferOffset < wireMessages.buffer.length) {
        const id = wireMessages.buffer[wireMessages.bufferOffset]
        const sizeOpcode = wireMessages.buffer[wireMessages.bufferOffset + 1]
        wireMessages.size = sizeOpcode >>> 16
        const opcode = sizeOpcode & 0x0000FFFF

        if (wireMessages.size > wireMessages.buffer.byteLength) {
          throw new Error('Request buffer too small')
        }

        const resource = this._resources[id]
        if (resource) {
          wireMessages.bufferOffset += 2
          wireMessages.consumed = 8
          await resource[opcode](wireMessages)
          if (this.closed) { return }
        } else {
          throw new Error(`invalid object ${id}`)
        }
      }
      this._inMessages.shift()
    }

    this.flush()
  }

  /**
   * This doesn't actually send the message, but queues it so it can be send on flush.
   * @param {{buffer: ArrayBuffer, fds: Array<WebFD>}}wireMsg a single wire message event.
   */
  onSend (wireMsg) {
    if (this.closed) { return }

    this._outMessages.push(wireMsg)
  }

  /**
   * Empty the queue of wire messages and send them to the other end.
   */
  flush () {
    if (this.closed) { return }
    if (this._outMessages.length === 0) { return }

    this.onFlush(this._outMessages)
    this._outMessages = []
  }

  /**
   * Callback when this connection wishes to send data to the other end. This callback can be used to send the given
   * array buffers using any transport mechanism.
   * @param {Array<{buffer: ArrayBuffer, fds: Array<WebFD>}>}wireMessages
   */
  onFlush (wireMessages) {}

  close () {
    if (this.closed) { return }

    // destroy resources in descending order
    Object.values(this.wlObjects).sort((a, b) => a.id - b.id).forEach((wlObject) => wlObject.destroy())

    this._outMessages = null
    this._inMessages = null
    this.closed = true
  }

  /**
   *
   * @param {WlObject} wlObject
   */
  registerWlObject (wlObject) {
    if (this.closed) { return }
    this.wlObjects[wlObject.id] = wlObject
  }

  /**
   *
   * @param {WlObject} wlObject
   */
  unregisterWlObject (wlObject) {
    if (this.closed) { return }
    delete this.wlObjects[wlObject.id]
  }
}

export default Connection