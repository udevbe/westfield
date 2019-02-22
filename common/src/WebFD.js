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

class WebFD {
  /**
   * @param {number}fd
   * @param {'ImageBitmap'|'ArrayBuffer'|'MessagePort'}fdType
   * @param {string}fdDomainUUID
   * @param {function(WebFD): Promise<Transferable>}onGetTransferable
   * @param {function(WebFD): Promise<void>} onClose
   */
  constructor (fd, fdType, fdDomainUUID, onGetTransferable, onClose) {
    /**
     * @type {number}
     */
    this.fd = fd
    /**
     * @type {string}
     */
    this.fdType = fdType
    /**
     * @type {string}
     */
    this.fdDomainUUID = fdDomainUUID
    /**
     * @type {function(WebFD): Promise<Transferable>}
     * @private
     */
    this._onGetTransferable = onGetTransferable
    /**
     * @type {function(WebFD): Promise<void>}
     * @private
     */
    this._onClose = onClose
  }

  /**
   * @return {Promise<Transferable>}
   */
  async getTransferable () {
    return await this._onGetTransferable(this)
  }

  /**
   * @return {Promise<void>}
   */
  async close () {
    await this._onClose(this)
  }
}

export default WebFD