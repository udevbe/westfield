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

const Resource = require('./Resource')
const {uint, object, string} = require('./WireFormat')

class DisplayResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
    /**
     * @type {DisplayRequests}
     */
    this.implementation = null
  }

  /**
   * opcode 0 -> sync
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} message
   */
  async [0] (message) {
    const args = this.client.unmarshallArgs(message, 'n')
    await this.implementation.sync(this, ...args)
  }

  /**
   * opcode 1 -> getRegistry
   *
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number}} message
   */
  async [1] (message) {
    const args = this.client.unmarshallArgs(message, 'n')
    await this.implementation.getRegistry(this, ...args)
  }

  /**
   *  The error event is sent out when a fatal (non-recoverable)
   *  error has occurred.  The object_id argument is the object
   *  where the error occurred, most often in response to a request
   *  to that object.  The code identifies the error and is defined
   *  by the object interface.  As such, each interface defines its
   *  own set of error codes.  The message is a brief description
   *  of the error, for (debugging) convenience.
   *
   * @param {Resource}errorObject object where the error occurred
   * @param {number}code error code
   * @param {string}message error description
   */
  error (errorObject, code, message) {
    this.client.marshall(this.id, 0, [object(errorObject), uint(code), string(message)])
    this.client.flush()
    this.client.close()
  }

  /**
   *  This event is used internally by the object ID management
   *  logic.  When a client deletes an object, the server will send
   *  this event to acknowledge that it has seen the delete request.
   *  When the client receives this event, it will know that it can
   *  safely reuse the object ID.
   *
   * @param {number}id deleted object ID
   */
  deleteId (id) {
    this.client.marshall(this.id, 1, [uint(id)])
  }
}

module.exports = DisplayResource