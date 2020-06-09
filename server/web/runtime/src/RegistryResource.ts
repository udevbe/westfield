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
import Resource from './protocol/Resource'
import { string, uint, u, s, n, WlMessage } from 'westfield-runtime-common'
import RegistryRequests from './RegistryRequests'

class RegistryResource extends Resource {
  implementation?: RegistryRequests

  constructor (client: Client, id: number, version: number) {
    super(client, id, version)
  }

  global (name: number, interface_: string, version: number) {
    this.client.marshall(this.id, 0, [uint(name), string(interface_), uint(version)])
  }

  /**
   * Notify the client that the global with the given name id is removed.
   */
  globalRemove (name: number) {
    this.client.marshall(this.id, 1, [uint(name)])
  }

  /**
   * opcode 0 -> bind
   *
   */
  async [0] (message: WlMessage) {
    await this.implementation?.bind(this.client, this, u(message), s(message), u(message), n(message))
  }
}

export default RegistryResource
