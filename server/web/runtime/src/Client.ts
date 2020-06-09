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


import { Connection, MessageMarshallingContext } from 'westfield-runtime-common'
import Display from './Display'
import DisplayRequests from './DisplayRequests'
import DisplayResource from './DisplayResource'
import Resource from './protocol/Resource'
import SyncCallbackResource from './SyncCallbackResource'

const SERVER_OBJECT_ID_BASE = 0xff000000

/**
 * Represents a client connection.
 */
class Client implements DisplayRequests {
  readonly id: string
  readonly connection: Connection
  readonly displayResource: DisplayResource = new DisplayResource(this, 1, 0)
  private _display: Display
  private _syncEventSerial: number = 0
  // @ts-ignore
  private _destroyedResolver: (value?: (PromiseLike<void> | void)) => void
  private _destroyPromise = new Promise<void>((resolve) => this._destroyedResolver = resolve)
  private _resourceDestroyListeners: ((resource: Resource) => void)[] = []
  private _resourceCreatedListeners: ((resource: Resource) => void)[] = []
  /*
   * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
   * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existent object
   */
  private _nextId: number = SERVER_OBJECT_ID_BASE
  private recycledIds: number[] = []

  constructor(display: Display, id: string) {
    this.id = id
    this.connection = new Connection()
    this._display = display
    this.displayResource.implementation = this
  }

  close() {
    if (this.connection.closed) {
      return
    }
    this.connection.close()

    // destroy resources in descending order
    Object.values(this.connection.wlObjects).sort((a, b) => a.id - b.id).forEach((resource) => resource.destroy())
    this._destroyedResolver()
  }

  onClose() {
    return this._destroyPromise
  }

  registerResource(resource: Resource) {
    this.connection.registerWlObject(resource)
  }

  unregisterResource(resource: Resource) {
    if (this.connection.closed) {
      return
    }

    this.connection.unregisterWlObject(resource)
    if (resource.id < SERVER_OBJECT_ID_BASE) {
      this.displayResource.deleteId(resource.id)
    } else {
      this.recycledIds.push(resource.id)
    }
    this._resourceDestroyListeners.forEach(listener => listener(resource))
  }

  addResourceCreatedListener(listener: (resource: Resource) => void) {
    this._resourceCreatedListeners.push(listener)
  }

  removeResourceCreatedListener(listener: (resource: Resource) => void) {
    const idx = this._resourceCreatedListeners.indexOf(listener)
    if (idx !== -1) {
      this._resourceCreatedListeners.splice(idx, 1)
    }
  }

  addResourceDestroyListener(listener: (resource: Resource) => void) {
    this._resourceDestroyListeners.push(listener)
  }

  removeResourceDestroyListener(listener: (resource: Resource) => void) {
    const idx = this._resourceDestroyListeners.indexOf(listener)
    if (idx !== -1) {
      this._resourceDestroyListeners.splice(idx, 1)
    }
  }

  marshallConstructor(id: number, opcode: number, argsArray: MessageMarshallingContext<any, any, any>[]): number {
    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    const serverSideId = this.getNextId()
    argsArray.forEach(arg => {
      if (arg.type === 'n') {
        arg.value = serverSideId
      }
      size += arg.size // add size of the actual argument values
    })

    this.connection.marshallMsg(id, opcode, size, argsArray)
    return serverSideId
  }

  marshall(id: number, opcode: number, argsArray: MessageMarshallingContext<any, any, any>[]) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(arg => size += arg.size)
    this.connection.marshallMsg(id, opcode, size, argsArray)
  }

  sync(resource: DisplayResource, id: number) {
    const syncCallbackResource = new SyncCallbackResource(resource.client, id, 1)
    syncCallbackResource.done(++this._syncEventSerial)
    syncCallbackResource.destroy()
  }

  getRegistry(resource: DisplayResource, id: number) {
    this._display.registry.publishGlobals(this._display.registry.createRegistryResource(this, id))
  }

  getNextId() {
    if (this.recycledIds.length) {
      return this.recycledIds.shift()!
    } else {
      return this._nextId++
    }
  }
}

export default Client
