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

/**
 * @returns {string}
 */
function uuidv4 () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

class Display {
  constructor () {
    /**
     * @type {Registry}
     */
    this.registry = new Registry()
    /**
     * @type {Object.<string,Client>}
     */
    this.clients = {}
    /**
     * @param {Client}client
     */
    this.onclientcreated = (client) => {}
    /**
     * @param {Client}client
     */
    this.onclientdestroyed = (client) => {}
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding Resource subtype.
   * @return {Client}
   */
  createClient () {
    const client = new Client(this, uuidv4())
    client.onClose().then(() => {
      this.onclientdestroyed(client)
      delete this.clients[client.id]
    })
    this.clients[client.id] = client
    this.onclientcreated(client)
    return client
  }

  flushClients () {
    Object.values(this.clients).forEach(client => client.connection.flush())
  }
}

export default Display
