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

import Display from './src/Display'

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

import WebArrayBufferProxy from './src/protocol/WebArrayBufferProxy'
import WebShmProxy from './src/protocol/WebShmProxy'
import WebArrayBufferEvents from './src/protocol/WebArrayBufferEvents'
import WebShmEvents from './src/protocol/WebShmEvents'

/**
 * @type {{Display: Display}}
 */
export {
  Display,

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

  WebArrayBufferProxy,
  WebShmProxy,
  WebArrayBufferEvents,
  WebShmEvents
}