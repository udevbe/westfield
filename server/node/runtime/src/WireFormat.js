'use strict'

const Fixed = require('./Fixed')

class WireFormat {
  /**
   * @param number
   * @return {Fixed}
   */
  static parseFixed (number) {
    return new Fixed((number * 256.0) >> 0)
  }

  /**
   * @param {number} arg
   * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
   *
   */
  static uint (arg) {
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
   * @param {number} arg
   * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
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
   * @param {number} arg
   * @returns {{value: *, type: string, size: number, optional: boolean, _marshallArg: _marshallArg}}
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
  static intOptional (arg) {
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
  static fixed (arg) {
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
  static fixedOptional (arg) {
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
  static object (arg) {
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
  static objectOptional (arg) {
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
  static newObject () {
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
   * @param {TypedArray} arg
   * @returns {{value: *, type: string, size: *, optional: boolean, _marshallArg: _marshallArg}}
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
}

module.exports = WireFormat