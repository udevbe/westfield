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

const westfieldNative = require('westfield-native')

class Endpoint {
  /**
   * @param {function(wlClient: Object):void}onClientCreated
   * @param {function(globalName: number):void}onGlobalCreated
   * @param {function(globalName: number):void}onGlobalDestroyed
   * @returns {Object} A started wayland display endpoint
   */
  static createDisplay (onClientCreated, onGlobalCreated, onGlobalDestroyed) {
    return westfieldNative.createDisplay(onClientCreated, onGlobalCreated, onGlobalDestroyed)
  }

  /**
   * @param {Object}wlClient
   * @param {function(wlClient: Object):void}onClientDestroyed
   */
  static setClientDestroyedCallback (wlClient, onClientDestroyed) {
    westfieldNative.setClientDestroyedCallback(wlClient, onClientDestroyed)
  }

  /**
   *
   * @param {Object}wlClient
   * @param {function(wlClient: Object, wireMessages:ArrayBuffer, objectId: number, opcode:number):number}onWireMessage
   */
  static setWireMessageCallback (wlClient, onWireMessage) {
    westfieldNative.setWireMessageCallback(wlClient, onWireMessage)
  }

  /**
   *
   * @param {Object}wlClient
   * @param {function(wlClient: Object, fdsIn:ArrayBuffer):void}onWireMessageEnd
   */
  static setWireMessageEndCallback (wlClient, onWireMessageEnd) {
    westfieldNative.setWireMessageEndCallback(wlClient, onWireMessageEnd)
  }

  /**
   * @param {Object} wlDisplay The previously started wayland display endpoint.
   */
  static destroyDisplay (wlDisplay) {
    westfieldNative.destroyDisplay(wlDisplay)
  }

  /**
   * @param {Object}wlDisplay
   * @returns {string}
   */
  static addSocketAuto (wlDisplay) {
    return westfieldNative.addSocketAuto(wlDisplay)
  }

  /**
   * @param {Object}wlClient A previously created wayland client.
   */
  static destroyClient (wlClient) {
    westfieldNative.destroyClient(wlClient)
  }

  /**
   * @param {Object}wlClient
   * @param {Uint32Array}wireMessages
   * @param {Uint32Array}fdsOut
   */
  static sendEvents (wlClient, wireMessages, fdsOut) {
    westfieldNative.sendEvents(wlClient, wireMessages, fdsOut)
  }

  /**
   * @param {Object}wlDisplay
   */
  static dispatchRequests (wlDisplay) {
    westfieldNative.dispatchRequests(wlDisplay)
  }

  /**
   * @param {Object}wlClient
   */
  static flush (wlClient) {
    westfieldNative.flush(wlClient)
  }

  /**
   * @param {Object}wlDisplay
   * @returns {number}
   */
  static getFd (wlDisplay) {
    return westfieldNative.getFd(wlDisplay)
  }

  /**
   * @param {Object}wlDisplay
   */
  static initShm (wlDisplay) {
    return westfieldNative.initShm(wlDisplay)
  }

  /**
   * @param {Object}wlClient
   * @param {function(wlRegistry:Object, registryId:number):void}onRegistryCreated
   */
  static setRegistryCreatedCallback (wlClient, onRegistryCreated) {
    westfieldNative.setRegistryCreatedCallback(wlClient, onRegistryCreated)
  }

  /**
   * @param {Object}wlRegistry
   */
  static emitGlobals (wlRegistry) {
    westfieldNative.emitGlobals(wlRegistry)
  }

  /**
   * @param {string}name
   * @param {string}signature
   * @param {Array<Object>}wlInterfaces
   * @return {Object}
   */
  static createWlMessage (name, signature, wlInterfaces) {
    return westfieldNative.createWlMessage(name, signature, wlInterfaces)
  }

  /**
   * @param {Object}wlInterface
   * @param {string}name
   * @param {number}version
   * @param {Array<Object>}wlMessageRequests
   * @param {Array<Object>}wlMessageEvents
   * @return {Object}
   */
  static initWlInterface (wlInterface, name, version, wlMessageRequests, wlMessageEvents) {
    westfieldNative.initWlInterface(wlInterface, name, version, wlMessageRequests, wlMessageEvents)
  }

  /**
   * @return {Object}
   */
  static createWlInterface () {
    return westfieldNative.createWlInterface()
  }

  /**
   * @param {Object}wlClient
   * @param {number}id
   * @param {number}version
   * @param {Object}wlInterface
   * @return {Object}
   */
  static createWlResource (wlClient, id, version, wlInterface) {
    return westfieldNative.createWlResource(wlClient, id, version, wlInterface)
  }

  /**
   * @param {Object}wlClient
   * @param {number}wlResourceId
   */
  static destroyWlResourceSilently (wlClient, wlResourceId) {
    westfieldNative.destroyWlResourceSilently(wlClient, wlResourceId)
  }

  /**
   * temp function.
   *
   * @deprecated do all encoding directly on the native side & return an h264/png/jpeg frame with meta-data. ie:
   * const { buffer, type, width, height, stride } = Endpoint.encode(wlClient, this.userData.bufferResourceId, config) instead.
   *
   * @param {Object}wlClient
   * @param {number}wlResourceId
   * @return {{ buffer:ArrayBuffer, width:number, height:number, stride:number }}
   */
  static getShmBuffer (wlClient, wlResourceId) {
    return westfieldNative.getShmBuffer(wlClient, wlResourceId)
  }

  /**
   * @param {Object}wlClient
   * @param {function(bufferId:number):void}onBufferCreated
   */
  static setBufferCreatedCallback (wlClient, onBufferCreated) {
    westfieldNative.setBufferCreatedCallback(wlClient, onBufferCreated)
  }

  /**
   * @param {Buffer}contents
   */
  static createMemoryMappedFile (contents) {
    return westfieldNative.createMemoryMappedFile(contents)
  }

  /**
   * @param {Object}wlClient
   * @param {Uint32Array}ids array to be filled in
   */
  static getServerObjectIdsBatch (wlClient, ids) {
    westfieldNative.getServerObjectIdsBatch(wlClient, ids)
  }

  /**
   * @param {Uint32Array}resultBuffer
   */
  static makePipe (resultBuffer) {
    westfieldNative.makePipe(resultBuffer)
  }
}

module.exports = Endpoint
