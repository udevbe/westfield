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

import { Connection, WebFD } from 'westfield-runtime-common'
import { WlSurfaceProxy } from './protocol/wayland'
import { Display, Proxy, WebFS } from './westfield-runtime-client'

const webFS = WebFS.create(_uuidv4())
const connection = new Connection()
const display = new Display(connection)

function _uuidv4(): string {
  // @ts-ignore
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ self.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function _setupMessageHandling(display: Display, connection: Connection, webFS: WebFS) {
  const _flushQueue: { buffer: ArrayBuffer, fds: Array<WebFD> }[][] = []

  onmessage = (event: MessageEvent) => {
    if (connection.closed) {
      return
    }

    const webWorkerMessage = event.data as { protocolMessage: ArrayBuffer, meta: Transferable[] }
    if (webWorkerMessage.protocolMessage instanceof ArrayBuffer) {
      const buffer = new Uint32Array(/** @type {ArrayBuffer} */webWorkerMessage.protocolMessage)
      const fds = webWorkerMessage.meta.map(transferable => {
        if (transferable instanceof ArrayBuffer) {
          return webFS.fromArrayBuffer(transferable)
        } else if (transferable instanceof ImageBitmap) {
          return webFS.fromImageBitmap(transferable)
        } else if (transferable instanceof OffscreenCanvas) {
          return webFS.fromOffscreenCanvas(transferable)
        }// else if (transferable instanceof MessagePort) {
        // }
        else {
          throw new Error(`COMPOSITOR BUG? Unsupported transferable received from compositor: ${transferable}.`)
        }
      })
      try {
        connection.message({ buffer, fds })
      } catch (e) {
        if (display.errorHandler && typeof display.errorHandler === 'function') {
          display.errorHandler(e)
        } else {
          console.error('\tname: ' + e.name + ' message: ' + e.message + ' text: ' + e.text)
          console.error('error object stack: ')
          console.error(e.stack)
        }
      }
    } else {
      console.error(`[web-worker-client] server send an illegal message.`)
      connection.close()
    }
  }

  connection.onFlush = async (wireMessages: { buffer: ArrayBuffer, fds: Array<WebFD> }[]): Promise<void> => {
    _flushQueue.push(wireMessages)

    if (_flushQueue.length > 1) {
      return
    }

    while (_flushQueue.length) {
      const sendWireMessages = _flushQueue[0]

      // convert to single arrayBuffer so it can be send over a data channel using zero copy semantics.
      const messagesSize = sendWireMessages.reduce((previousValue, currentValue) => previousValue + currentValue.buffer.byteLength, 0)

      const sendBuffer = new Uint32Array(new ArrayBuffer(messagesSize))
      let offset = 0
      const meta: Transferable[] = []
      for (const wireMessage of sendWireMessages) {
        for (const webFd of wireMessage.fds) {
          const transferable = await webFd.getTransferable()
          meta.push(transferable)
        }
        const message = new Uint32Array(wireMessage.buffer)
        sendBuffer.set(message, offset)
        offset += message.length
      }

      self.postMessage({ protocolMessage: sendBuffer.buffer, meta }, [sendBuffer.buffer, ...meta])
      _flushQueue.shift()
    }
  }
}

_setupMessageHandling(display, connection, webFS)

function frame(wlSurfaceProxy: WlSurfaceProxy): () => Promise<number> {
  return () => {
    return new Promise(resolve => {
      const wlCallbackProxy = wlSurfaceProxy.frame()
      wlCallbackProxy.listener = {
        done: (data: number) => {
          resolve(data)
          wlCallbackProxy.destroy()
        }
      }
    })
  }
}

export {
  webFS,
  display,
  Display,
  Connection,
  frame,
  Proxy
}

export * from './protocol/wayland'
export * from './protocol/gr_web_gl'
export * from './protocol/gr_web_shm'
export * from './protocol/xdg_shell'

