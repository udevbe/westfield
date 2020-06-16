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

import { Connection } from 'westfield-runtime-common'
import WlDisplayProxy from './protocol/WlDisplayProxy'

export default class Display {
  private _recycledIds: number[] = []
  private _connection: Connection
  private _displayProxy: WlDisplayProxy
  private _lastId: number = 1
  // @ts-ignore
  private _destroyResolve: (value?: void | PromiseLike<void>) => void
  // @ts-ignore
  private _destroyReject: (reason?: any) => void
  private readonly _destroyPromise: Promise<void>
  /**
   * Set this to have a default 'catch-all' application error handler. Can be undefined for default behavior.
   */
  errorHandler?: (error: Error) => void

  constructor(connection: Connection) {
    this._connection = connection
    this._displayProxy = new WlDisplayProxy(this, this._connection, 1)
    this._destroyPromise = new Promise(((resolve, reject) => {
      this._destroyResolve = resolve
      this._destroyReject = reject
    }))

    this._displayProxy.listener = {
      deleteId: (id: number) => {
        this._recycledIds.push(id)
      },
      error: (proxy: Proxy, code: number, message: string) => {
        this._protocolError(proxy, code, message)
      }
    }
  }

  close() {
    if (this._connection.closed) {
      return
    }
    this._connection.close()
    this._destroyResolve()
  }

  _protocolError(proxy: Proxy, code: number, message: string) {
    if (this._connection.closed) {
      return
    }
    this._connection.close()
    this._destroyReject(new Error(`Protocol error. type: ${proxy.constructor.name}, id: ${proxy.id}, code: ${code}, message: ${message}`))
  }

  /**
   * Resolves once the connection is closed normally ie. with a call to close(). The promise will be rejected with an
   * error if the connection is closed abnormally ie when a protocol error is received.
   *
   */
  onClose(): Promise<void> {
    return this._destroyPromise
  }

  getRegistry(): WlRegistryProxy {
    return this._displayProxy.getRegistry()
  }

  /**
   * For internal use. Generates the id of the next proxy object.
   *
   */
  generateNextId(): number {
    if (this._recycledIds.length) {
      return this._recycledIds.shift()!
    } else {
      return ++this._lastId
    }
  }

  /**
   * Wait for the compositor to have send us all remaining events.
   *
   * The data in the resolved promise is the event serial.
   *
   * Don't 'await' this sync call as it will result in a deadlock where the worker will block all incoming events,
   * including the event the resolves the await state. Instead use the classic 'then(..)' construct.
   *
   */
  sync(): Promise<number> {
    return new Promise<number>(resolve => {
      const wlCallbackProxy = this._displayProxy.sync()
      wlCallbackProxy.listener = {
        done: (data: number) => {
          resolve(data)
          wlCallbackProxy.destroy()
        }
      }
    })
  }

  /**
   * Send queued messages to the compositor.
   */
  flush() {
    this._connection.flush()
  }
}
