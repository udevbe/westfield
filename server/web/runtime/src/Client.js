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
  /**
   * @param {ArrayBuffer}incomingMessage
   */
  outOfBandMessage (incomingMessage) {
    const dataView = new DataView(incomingMessage)
    const objectId = dataView.getUint32(0, true)
    const opcode = dataView.getUint32(Uint32Array.BYTES_PER_ELEMENT, true)

    const outOfBandHandlers = this._outOfBandListeners[objectId]
    if (outOfBandHandlers) {
      const handler = outOfBandHandlers[opcode]
      if (handler) {
        handler(incomingMessage)
      } else {
        console.log(`Out of band object id: ${objectId} does not have listener for opcode: ${opcode}.`)
      }
    } else {
      console.log(`Out of band object id: ${objectId} using opcode: ${opcode} not found.`)
    }
  }

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
    // get next server id
    const objectId = this._display.nextId
    this._display.nextId++

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(arg => {
      if (arg.type === 'n') { arg.value = objectId }
      size += arg.size // add size of the actual argument values
    })

    this.connection.marshallMsg(id, opcode, size, argsArray)
    return objectId
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
   * @param {number}objectId
   * @param {number}opcode
   * @param {function(ArrayBuffer):void}listener
   */
  setOutOfBandListener (objectId, opcode, listener) {
    let opcodeHandlers = this._outOfBandListeners[objectId]
    if (!opcodeHandlers) {
      opcodeHandlers = {}
      this._outOfBandListeners[objectId] = opcodeHandlers
    }
    opcodeHandlers[opcode] = listener
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   */
  removeOutOfBandListener (objectId, opcode) {
    const opcodeHandlers = this._outOfBandListeners[objectId]
    if (opcodeHandlers) { delete opcodeHandlers[opcode] }
  }

  /**
   * @param {number}objectId
   */
  removeAllOutOfBandListeners (objectId) {
    delete this._outOfBandListeners[objectId]
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {ArrayBuffer}payload
   */
  sendOutOfBand (objectId, opcode, payload) {
    // FIXME there's the danger of sending > 16kb, which might fail in chrome. => Chunk the message
    const sendBuffer = new ArrayBuffer(8 + payload.byteLength)
    const dataView = new DataView(sendBuffer)
    dataView.setUint32(0, objectId, true)
    dataView.setUint32(4, opcode, true)
    new Uint8Array(sendBuffer, 8).set(new Uint8Array(payload))

    this._onOutOfBandSend(sendBuffer)
  }

  /**
   * @param {Display} display
   * @param {function(ArrayBuffer):void}onOutOfBandSend
   */
  constructor (display, onOutOfBandSend) {
    super()
    this.connection = new Connection()
    /**
     * @type {function(ArrayBuffer): void}
     * @private
     */
    this._onOutOfBandSend = onOutOfBandSend
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
     * Out of band listeners. Allows for messages & listeners not part of the ordinary wayland protocol.
     * @type {Object.<number, Object.<number, function(ArrayBuffer):void>>}
     * @private
     */
    this._outOfBandListeners = {}
    /**
     * @type {Array<function(Resource):void>}
     * @private
     */
    this._resourceDestroyListeners = []
  }
}

export default Client