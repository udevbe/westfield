/*
MIT License

Copyright (c) 2020 Erik De Rijcke

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

import { n, object, string, uint, WlMessage } from 'westfield-runtime-common'
import Client from './Client'
import DisplayRequests from './DisplayRequests'
import Resource from './protocol/Resource'


class DisplayResource extends Resource {
  implementation?: DisplayRequests

  constructor(client: Client, id: number, version: number) {
    super(client, id, version)
  }

  /**
   * opcode 0 -> sync
   *
   */
  async [0](message: WlMessage) {
    await this.implementation?.sync(this, n(message))
  }

  /**
   * opcode 1 -> getRegistry
   *
   */
  async [1](message: WlMessage) {
    await this.implementation?.getRegistry(this, n(message))
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
   * @param errorObject object where the error occurred
   * @param code error code
   * @param message error description
   */
  error(errorObject: Resource, code: number, message: string) {
    this.client.marshall(this.id, 0, [object(errorObject), uint(code), string(message)])
    this.client.connection.flush()
    this.client.connection.close()
  }

  /**
   *  This event is used internally by the object ID management
   *  logic.  When a client deletes an object, the server will send
   *  this event to acknowledge that it has seen the delete request.
   *  When the client receives this event, it will know that it can
   *  safely reuse the object ID.
   *
   * @param id deleted object ID
   */
  deleteId(id: number) {
    this.client.marshall(this.id, 1, [uint(id)])
  }
}

export default DisplayResource
