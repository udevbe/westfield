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

import DisplayResource from './DisplayResource'
import DisplayRequests from './DisplayRequests'
import SyncCallbackResource from './SyncCallbackResource'
import { Connection } from 'westfield-runtime-common'

/**
 * Represents a client connection.
 * @implements DisplayRequests
 */
class Client extends DisplayRequests {
  close () {
    if (this.connection.closed) { return }
    this.connection.close()

    // destroy resources in descending order
    Object.values(this.connection.wlObjects).sort((a, b) => a.id - b.id).forEach((resource) => resource.destroy())
    this.displayResource = null
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
    this.connection.registerWlObject(resource)
  }

  /**
   *
   * @param {Resource} resource
   */
  unregisterResource (resource) {
    if (this.connection.closed) { return }

    this.connection.unregisterWlObject(resource)
    this.displayResource.deleteId(resource.id)
    this._resourceDestroyListeners.forEach(listener => listener(resource))
  }

  /**
   * @param {function(Resource):void}listener
   */
  addResourceDestroyListener (listener) {
    this._resourceDestroyListeners.push(listener)
  }

  /**
   * @param {function(Resource):void}listener
   */
  removeResourceDestroyListener (listener) {
    const idx = this._resourceDestroyListeners.indexOf(listener)
    if (idx !== -1) {
      this._resourceDestroyListeners.splice(idx, 1)
    }
  }

  /**
   * @param {number} id
   * @param {number} opcode
   * @param {Array<{value: *, type: string, size: number, optional: boolean, _marshallArg: function({buffer: ArrayBuffer, fds: Array<WebFD>, bufferOffset: number}):void}>} argsArray
   * @return {number}
   */
  marshallConstructor (id, opcode, argsArray) {
    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    const serverSideId = this._nextId++
    argsArray.forEach(arg => {
      if (arg.type === 'n') { arg.value = serverSideId }
      size += arg.size // add size of the actual argument values
    })

    this.connection.marshallMsg(id, opcode, size, argsArray)
    return serverSideId
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
   * @param {Display} display
   * @param {string}id
   */
  constructor (display, id) {
    super()
    /**
     * @type {string}
     */
    this.id = id
    /**
     * @type {Connection}
     */
    this.connection = new Connection()
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
    this._destroyPromise = new Promise((resolve) => this._destroyedResolver = resolve)
    /**
     * @type {DisplayResource}
     */
    this.displayResource = new DisplayResource(this, 1, 0)
    this.displayResource.implementation = this
    /**
     * @type {Array<function(Resource):void>}
     * @private
     */
    this._resourceDestroyListeners = []
    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existent object
     */
    /**
     * @type {number}
     * @private
     */
    this._nextId = 0xff000000
  }
}

export default Client