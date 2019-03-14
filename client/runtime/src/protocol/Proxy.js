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

import { WlObject } from 'westfield-runtime-common'

export default class Proxy extends WlObject {
  /**
   * @param {Display} display
   * @param {Connection}connection
   * @param {number}id
   */
  constructor (display, connection, id) {
    super(id)
    /**
     * @type {Display}
     * @private
     */
    this.display = display
    /**
     * @type {Connection}
     * @protected
     */
    this._connection = connection
    connection.registerWlObject(this)
  }

  destroy () {
    super.destroy()
    this._connection.unregisterWlObject(this)
  }

  /**
   * For internal use only.
   * @param {number} id
   * @param {number} opcode
   * @param {Function} proxyClass
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   * @protected
   */
  _marshallConstructor (id, opcode, proxyClass, argsArray) {
    // construct new object
    const proxy = new proxyClass(this.display, this._connection, this.display.generateNextId())

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(arg => {
      if (arg.type === 'n') {
        arg.value = proxy.id
      }
      size += arg.size
    })

    this._connection.marshallMsg(id, opcode, size, argsArray)

    return proxy
  }

  /**
   * For internal use only.
   * @param {number} id
   * @param {number} opcode
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   * @protected
   */
  _marshall (id, opcode, argsArray) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(arg => size += arg.size)
    this._connection.marshallMsg(id, opcode, size, argsArray)
  }
}


