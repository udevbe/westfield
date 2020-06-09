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

class Global {
  readonly registry: Registry
  readonly implementation: any
  readonly interface_: string
  readonly version: number
  readonly name: number

  private readonly _bindCallback: (client: Client, id: number, version: number) => void

  /**
   * Use Registry.createGlobal(..) instead.
   */
  constructor(
    registry: Registry,
    implementation: any,
    interface_: string,
    version: number,
    name: number,
    bindCallback: (client: Client, id: number, version: number) => void
  ) {
    this.registry = registry
    this.implementation = implementation
    this._bindCallback = bindCallback
    this.interface_ = interface_
    this.version = version
    this.name = name
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding Resource subtype.
   *
   */
  bindClient(client: Client, id: number, version: number) {
    this._bindCallback(client, id, version)
  }

  destroy() {
    if (this.registry) {
      this.registry.destroyGlobal(this)
    }
  }
}

export default Global
