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

class Global {
  /**
   *
   * @param {Registry}registry
   * @param {Object}implementation
   * @param {string} interface_
   * @param {number} version
   * @param {number}name
   * @param {function(Client,number,number):void}bindCallback
   */
  constructor (registry, implementation, interface_, version, name, bindCallback) {
    /**
     * @type {Registry}
     */
    this.registry = registry
    /**
     * @type {Object}
     */
    this.implementation = implementation
    /**
     * @type {function(Client, number, number): void}
     * @private
     */
    this._bindCallback = bindCallback
    /**
     * @type {string}
     */
    this.interface_ = interface_
    /**
     * @type {number}
     */
    this.version = version
    /**
     * @type {number}
     */
    this.name = name
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding Resource subtype.
   *
   * @param {Client} client
   * @param {number} id
   * @param {number} version
   */
  bindClient (client, id, version) {
    this._bindCallback(client, id, version)
  }

  destroy () {
    if (this.registry) {
      this.registry.destroyGlobal(this)
      this.registry = null
    }
  }
}

module.exports = Global