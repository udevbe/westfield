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
import Display from './Display'
import GrWebGlBufferEvents from './protocol/GrWebGlBufferEvents'
// web gl
import GrWebGlBufferProxy from './protocol/GrWebGlBufferProxy'
import GrWebGlProxy from './protocol/GrWebGlProxy'
import GrWebShmBufferEvents from './protocol/GrWebShmBufferEvents'
// web shm
import GrWebShmBufferProxy from './protocol/GrWebShmBufferProxy'
import GrWebShmProxy from './protocol/GrWebShmProxy'
// import WlShmEvents from './protocol/WlShmEvents'
import WlBufferEvents from './protocol/WlBufferEvents'
// import WlShmPoolProxy from './protocol/WlShmPoolProxy'
// import WlShmProxy from './protocol/WlShmProxy'
import WlBufferProxy from './protocol/WlBufferProxy'
import WlCallbackEvents from './protocol/WlCallbackEvents'
import WlCallbackProxy from './protocol/WlCallbackProxy'
import WlCompositorProxy from './protocol/WlCompositorProxy'
import WlDataDeviceEvents from './protocol/WlDataDeviceEvents'
import WlDataDeviceManagerProxy from './protocol/WlDataDeviceManagerProxy'
import WlDataDeviceProxy from './protocol/WlDataDeviceProxy'
import WlDataOfferEvents from './protocol/WlDataOfferEvents'
import WlDataOfferProxy from './protocol/WlDataOfferProxy'
import WlDataSourceEvents from './protocol/WlDataSourceEvents'
import WlDataSourceProxy from './protocol/WlDataSourceProxy'
import WlDisplayEvents from './protocol/WlDisplayEvents'
// core wayland protocol
import WlDisplayProxy from './protocol/WlDisplayProxy'
import WlKeyboardEvents from './protocol/WlKeyboardEvents'
import WlKeyboardProxy from './protocol/WlKeyboardProxy'
import WlOutputEvents from './protocol/WlOutputEvents'
import WlOutputProxy from './protocol/WlOutputProxy'
import WlPointerEvents from './protocol/WlPointerEvents'
import WlPointerProxy from './protocol/WlPointerProxy'
import WlRegionProxy from './protocol/WlRegionProxy'
import WlRegistryEvents from './protocol/WlRegistryEvents'
import WlRegistryProxy from './protocol/WlRegistryProxy'
import WlSeatEvents from './protocol/WlSeatEvents'
import WlSeatProxy from './protocol/WlSeatProxy'
import WlShellProxy from './protocol/WlShellProxy'
import WlShellSurfaceEvents from './protocol/WlShellSurfaceEvents'
import WlShellSurfaceProxy from './protocol/WlShellSurfaceProxy'
import WlSubcompositorProxy from './protocol/WlSubcompositorProxy'
import WlSubsurfaceProxy from './protocol/WlSubsurfaceProxy'
import WlSurfaceEvents from './protocol/WlSurfaceEvents'
import WlSurfaceProxy from './protocol/WlSurfaceProxy'
import WlTouchEvents from './protocol/WlTouchEvents'
import WlTouchProxy from './protocol/WlTouchProxy'
import XdgPopupEvents from './protocol/XdgPopupEvents'
import XdgPopupProxy from './protocol/XdgPopupProxy'
import XdgPositionerProxy from './protocol/XdgPositionerProxy'
import XdgSurfaceEvents from './protocol/XdgSurfaceEvents'
import XdgSurfaceProxy from './protocol/XdgSurfaceProxy'
import XdgToplevelEvents from './protocol/XdgToplevelEvents'
import XdgToplevelProxy from './protocol/XdgToplevelProxy'
import XdgWmBaseEvents from './protocol/XdgWmBaseEvents'
// xdg_shell
import XdgWmBaseProxy from './protocol/XdgWmBaseProxy'
import WebFS from './WebFS'

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
  frame,

  WlDisplayProxy,
  WlRegistryProxy,
  WlCallbackProxy,
  WlCompositorProxy,
  WlBufferProxy,
  WlDataOfferProxy,
  WlDataSourceProxy,
  WlDataDeviceProxy,
  WlDataDeviceManagerProxy,
  WlShellProxy,
  WlShellSurfaceProxy,
  WlSurfaceProxy,
  WlSeatProxy,
  WlPointerProxy,
  WlKeyboardProxy,
  WlTouchProxy,
  WlOutputProxy,
  WlRegionProxy,
  WlSubcompositorProxy,
  WlSubsurfaceProxy,
  WlDisplayEvents,
  WlRegistryEvents,
  WlCallbackEvents,
  WlBufferEvents,
  WlDataOfferEvents,
  WlDataSourceEvents,
  WlDataDeviceEvents,
  WlShellSurfaceEvents,
  WlSurfaceEvents,
  WlSeatEvents,
  WlPointerEvents,
  WlKeyboardEvents,
  WlTouchEvents,
  WlOutputEvents,

  XdgWmBaseProxy,
  XdgPositionerProxy,
  XdgSurfaceProxy,
  XdgToplevelProxy,
  XdgPopupProxy,
  XdgWmBaseEvents,
  XdgSurfaceEvents,
  XdgToplevelEvents,
  XdgPopupEvents,

  GrWebShmBufferProxy,
  GrWebShmProxy,
  GrWebShmBufferEvents,

  GrWebGlBufferProxy,
  GrWebGlBufferEvents,
  GrWebGlProxy
}
