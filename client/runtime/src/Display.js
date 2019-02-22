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

import { Connection } from 'westfield-runtime-common'
import SyncCallbackProxy from './SyncCallbackProxy'
import RegistryProxy from './RegistryProxy'
import Proxy from './Proxy'

const { newObject, o, u, s } = Connection

class Display extends Proxy {
  constructor () {
    // Proxy expects a display object as super arg. We can't do that here so we set it immediately afterwards.
    // This is mostly to make our connection object be in line of a general WlObject layout as the connection object
    // is a special case as it's the core root object.
    super(null, 1)
    /**
     * @type {Display}
     */
    super.display = this
    /**
     * @type {Display}
     */
    this.implementation = this
    this.connection = new Connection()
    /**
     * @type {number}
     */
    this.nextId = 2
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {function} proxyConstructor
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   */
  marshallConstructor (id, opcode, proxyConstructor, argsArray) {
    // construct new object
    const proxy = new proxyConstructor(this, this.nextId++)
    this.registerProxy(proxy)

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(arg => {
      if (arg.type === 'n') {
        arg.value = proxy.id
      }
      size += arg.size
    })

    this.connection.marshallMsg(id, opcode, size, argsArray)

    return proxy
  }

  /**
   *
   * @param {number} id
   * @param {number} opcode
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   */
  marshall (id, opcode, argsArray) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(arg => size += arg.size)
    this.connection.marshallMsg(id, opcode, size, argsArray)
  }

  close () {
    if (this.connection.closed) { return }
    this.connection.close()
    this.display = null
    this.implementation = null
    this._destroyedResolver()
  }

  /**
   *
   * @param {Proxy} proxy
   */
  registerProxy (proxy) {
    this.connection.registerWlObject(proxy)
    // TODO proxy created listener?
  }

  /**
   * @param {Proxy}proxy
   * @private
   */
  unregisterProxy (proxy) {
    this.connection.unregisterWlObject(proxy)
    // TODO proxy destroyed listener?
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
  error (proxy, code, message) {
    console.error(message)
    this.close()
  }

  /**
   * @param {number}id
   * @private
   */
  _deleteId (id) {
    // TODO object id recycling
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
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   */
  [0] (message) {
    this.close()
    this.implementation.error(o(message, false, this.connection), u(message), s(message, false))
  }

  /**
   * opcode 1 -> deleteId
   *
   * @param {{buffer: Uint32Array, fds: Array<WebFD>, bufferOffset: number, consumed: number, size: number}} message
   */
  [0] (message) {
    this.implementation._deleteId(u(message))
  }
}

export default Display
