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

import Client from './Client'
import Registry from './Registry'

class Display {
  constructor () {
    /**
     * @type {Registry}
     */
    this.registry = new Registry()
    /**
     * @type {Array<Client>}
     */
    this.clients = []
    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existent object
     */
    /**
     * @type {number}
     */
    this.nextId = 0xff000000
  }

  /**
   * Next server side object id.
   * @return {number}
   */
  getNextObjectId () {
    return ++this.nextId
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding Resource subtype.
   * @param {function(ArrayBuffer):void}onOutOfBandSend
   * @return {Client}
   */
  createClient (onOutOfBandSend) {
    const client = new Client(this, onOutOfBandSend)
    client.onClose().then(() => {
      const idx = this.clients.indexOf(client)
      if (idx > -1) {
        this.clients.splice(idx, 1)
      }
    })
    this.clients.push(client)
    return client
  }

  flushClients () {
    this.clients.forEach(client => client.connection.flush())
  }
}

export default Display
