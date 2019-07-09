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

import WebFS from './src/WebFS'
import Display from './src/Display'
import { Connection } from 'westfield-runtime-common'

// core wayland protocol
import WlDisplayProxy from './src/protocol/WlDisplayProxy'
import WlRegistryProxy from './src/protocol/WlRegistryProxy'
import WlCallbackProxy from './src/protocol/WlCallbackProxy'
import WlCompositorProxy from './src/protocol/WlCompositorProxy'
// import WlShmPoolProxy from './src/protocol/WlShmPoolProxy'
// import WlShmProxy from './src/protocol/WlShmProxy'
import WlBufferProxy from './src/protocol/WlBufferProxy'
import WlDataOfferProxy from './src/protocol/WlDataOfferProxy'
import WlDataSourceProxy from './src/protocol/WlDataSourceProxy'
import WlDataDeviceProxy from './src/protocol/WlDataDeviceProxy'
import WlDataDeviceManagerProxy from './src/protocol/WlDataDeviceManagerProxy'
import WlShellProxy from './src/protocol/WlShellProxy'
import WlShellSurfaceProxy from './src/protocol/WlShellSurfaceProxy'
import WlSurfaceProxy from './src/protocol/WlSurfaceProxy'
import WlSeatProxy from './src/protocol/WlSeatProxy'
import WlPointerProxy from './src/protocol/WlPointerProxy'
import WlKeyboardProxy from './src/protocol/WlKeyboardProxy'
import WlTouchProxy from './src/protocol/WlTouchProxy'
import WlOutputProxy from './src/protocol/WlOutputProxy'
import WlRegionProxy from './src/protocol/WlRegionProxy'
import WlSubcompositorProxy from './src/protocol/WlSubcompositorProxy'
import WlSubsurfaceProxy from './src/protocol/WlSubsurfaceProxy'
import WlDisplayEvents from './src/protocol/WlDisplayEvents'
import WlRegistryEvents from './src/protocol/WlRegistryEvents'
import WlCallbackEvents from './src/protocol/WlCallbackEvents'
// import WlShmEvents from './src/protocol/WlShmEvents'
import WlBufferEvents from './src/protocol/WlBufferEvents'
import WlDataOfferEvents from './src/protocol/WlDataOfferEvents'
import WlDataSourceEvents from './src/protocol/WlDataSourceEvents'
import WlDataDeviceEvents from './src/protocol/WlDataDeviceEvents'
import WlShellSurfaceEvents from './src/protocol/WlShellSurfaceEvents'
import WlSurfaceEvents from './src/protocol/WlSurfaceEvents'
import WlSeatEvents from './src/protocol/WlSeatEvents'
import WlPointerEvents from './src/protocol/WlPointerEvents'
import WlKeyboardEvents from './src/protocol/WlKeyboardEvents'
import WlTouchEvents from './src/protocol/WlTouchEvents'
import WlOutputEvents from './src/protocol/WlOutputEvents'

// xdg_shell
import XdgWmBaseProxy from './src/protocol/XdgWmBaseProxy'
import XdgPositionerProxy from './src/protocol/XdgPositionerProxy'
import XdgSurfaceProxy from './src/protocol/XdgSurfaceProxy'
import XdgToplevelProxy from './src/protocol/XdgToplevelProxy'
import XdgPopupProxy from './src/protocol/XdgPopupProxy'
import XdgWmBaseEvents from './src/protocol/XdgWmBaseEvents'
import XdgSurfaceEvents from './src/protocol/XdgSurfaceEvents'
import XdgToplevelEvents from './src/protocol/XdgToplevelEvents'
import XdgPopupEvents from './src/protocol/XdgPopupEvents'

// web shm
import GrWebShmBufferProxy from './src/protocol/GrWebShmBufferProxy'
import GrWebShmProxy from './src/protocol/GrWebShmProxy'
import GrWebShmBufferEvents from './src/protocol/GrWebShmBufferEvents'

// web gl
import GrWebGlBufferProxy from './src/protocol/GrWebGlBufferProxy'
import GrWebGlProxy from './src/protocol/GrWebGlProxy'

/**
 * @type {WebFS}
 */
const webFS = WebFS.create(_uuidv4())
/**
 * @type {Connection}
 */
const connection = new Connection()
/**
 * @type {Display}
 */
const display = new Display(connection)

/**
 * @returns {string}
 * @private
 */
function _uuidv4 () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ self.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

/**
 * @param {Display}display
 * @param {Connection}connection
 * @param {WebFS}webFS
 * @private
 */
function _setupMessageHandling (display, connection, webFS) {
  /**
   * @type {Array<Array<{buffer: ArrayBuffer, fds: Array<WebFD>}>>}
   * @private
   */
  const _flushQueue = []
  /**
   * @param {MessageEvent}event
   */
  onmessage = (event) => {
    if (connection.closed) { return }

    const webWorkerMessage = /** @type {{protocolMessage:ArrayBuffer, meta:Array<Transferable>}} */event.data
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
        console.warn(`COMPOSITOR BUG? Unsupported transferable received from compositor: ${transferable}. WebFD will be null.`)
        return null
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

  /**
   * @param {Array<{buffer: ArrayBuffer, fds: Array<WebFD>}>}wireMessages
   * @return {Promise<void>}
   */
  connection.onFlush = async (wireMessages) => {
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
      const meta = []
      for (const wireMessage of sendWireMessages) {
        for (const webFd of wireMessage.fds) {
          const transferable = await webFd.getTransferable()
          meta.push(transferable)
        }
        const message = new Uint32Array(wireMessage.buffer)
        sendBuffer.set(message, offset)
        offset += message.length
      }

      postMessage({ protocolMessage: sendBuffer.buffer, meta }, [sendBuffer.buffer].concat(meta))
      _flushQueue.shift()
    }
  }
}

_setupMessageHandling(display, connection, webFS)

/**
 * @param {WlSurfaceProxy}wlSurfaceProxy
 * @return {function(): Promise<number>}
 */
function frame (wlSurfaceProxy) {
  return () => {
    return new Promise(resolve => {
      const wlCallbackProxy = wlSurfaceProxy.frame()
      wlCallbackProxy.listener = {
        done: (data) => {
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
  GrWebGlProxy
}