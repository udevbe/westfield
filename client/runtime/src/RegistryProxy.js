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

const {uint, newObject, string} = require('./WireFormat')

class RegistryProxy extends Proxy {
  /**
   * @param {Display}display
   */
  constructor (display) {
    super(display)
    /**
     * @type {RegistryEvents}
     */
    this.listener = null
  }

  /**
   * Bind a new object to the global.
   *
   * Binds a new, client-created object to the server using the specified name as the identifier.
   *
   * @param {number} name unique numeric name of the global
   * @param {string} interface_ interface implemented by the new object
   * @param {function} proxyConstructor
   * @param {number} version The version used and supported by the client
   * @return {Object} a new bounded object
   */
  bind (name, interface_, proxyConstructor, version) {
    return this.display.marshallConstructor(this._id, 0, proxyConstructor, [uint(name), string(interface_), uint(version), newObject()])
  }

  [0] (message) {
    const args = this.display.unmarshallArgs(message, 'isu')
    this.listener.global(...args)
  }

  [1] (message) {
    const args = this.display.unmarshallArgs(message, 'i')
    this.listener.globalRemove(...args)
  }
}

RegistryProxy.name = RegistryProxy.constructor.name
module.exports = RegistryProxy
