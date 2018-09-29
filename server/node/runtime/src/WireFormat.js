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

const Fixed = require('./Fixed')

class WireFormat {

  /**
   * @param {number} arg
   * @returns {{value: number, type: 'u', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   */
  static uint (arg) {
    return {
      value: arg,
      type: 'u',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: number, type: 'u', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @param {number} arg
   * @returns {{value: number, type: 'h', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   *
   */
  static fileDescriptor (arg) {
    return {
      value: arg,
      type: 'h',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: number, type: 'h', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   *
   */
  static fileDescriptorOptional (arg) {
    return {
      value: arg,
      type: 'h',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: number, type: 'i', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: number, type: 'i', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: Fixed, type: 'f', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   */
  static fixed (arg) {
    return {
      value: arg,
      type: 'f',
      size: 4,
      optional: false,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: Fixed, type: 'f', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   */
  static fixedOptional (arg) {
    return {
      value: arg,
      type: 'f',
      size: 4,
      optional: true,
      /**
       *
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: Resource, type: 'o', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: Resource, type: 'o', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
       * @private
       */
      _marshallArg: function (wireMsg) {
        new Uint32Array(wireMsg.buffer, wireMsg.bufferOffset, 1)[0] = (arg === null ? 0 : this.value.id)
        wireMsg.bufferOffset += this.size
      }
    }
  }

  /**
   * @returns {{value: number, type: 'n', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   */
  static newObject () {
    return {
      value: 0, // id filled in by _marshallConstructor
      type: 'n',
      size: 4,
      optional: false,
      /**
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: string, type: 's', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   *
   */
  static string (arg) {
    return {
      value: arg,
      type: 's',
      size: 4 + (function () {
        // fancy logic to calculate size with padding to a multiple of 4 bytes (int).
        return (arg.length + 3) & ~3
      })(),
      optional: false,
      /**
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: *, type: 's', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
   *
   */
  static stringOptional (arg) {
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: *, type: 'a', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
       * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} wireMsg
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
   * @returns {{value: *, type: 'a', size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}):void}}
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
}

module.exports = WireFormat