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

class CompositorEndpoint {
  /**
   * @returns {CompositorEndpoint}
   */
  static create () {
    return new CompositorEndpoint()
  }

  /**
   * @param {function(wlClient: Object):void}onClientCreated
   * @param {function(wlClient: Object):void}onClientDestroyed
   * @param {function(wlClient: Object, wireMessages:ArrayBuffer, fdsIn: ArrayBuffer):void}onWireMessage
   * @returns {Object} A started wayland display endpoint
   */
  createDisplay (onClientCreated, onClientDestroyed, onWireMessage) {
    return westfieldNative.createDisplay(onClientCreated, onClientDestroyed, onWireMessage)
  }

  /**
   * @param {Object} wlDisplay The previously started wayland display endpoint.
   */
  destroyDisplay (wlDisplay) {
    westfieldNative.destroyDisplay(wlDisplay)
  }

  /**
   * @param {Object}wlDisplay
   * @returns {string}
   */
  addSocketAuto (wlDisplay) {
    return westfieldNative.addSocketAuto(wlDisplay)
  }

  /**
   * @param {Object}wlClient A previously created wayland client.
   */
  destroyClient (wlClient) {
    westfieldNative.destroyClient(wlClient)
  }

  /**
   * @param {Object}wlClient
   * @param {ArrayBuffer}wireMessages
   * @param {ArrayBuffer}fdsOut
   */
  sendEvents (wlClient, wireMessages, fdsOut) {
    westfieldNative.sendEvents(wlClient, wireMessages, fdsOut)
  }

  /**
   * @param {Object}wlDisplay
   */
  dispatchRequests (wlDisplay) {
    westfieldNative.dispatchRequests(wlDisplay)
  }

  /**
   * @param {Object}wlDisplay
   */
  flushEvents (wlDisplay) {
    westfieldNative.flushEvents(wlDisplay)
  }

  /**
   * @param {Object}wlDisplay
   * @returns {number}
   */
  getFd (wlDisplay) {
    return westfieldNative.getFd(wlDisplay)
  }
}

module.exports = CompositorEndpoint