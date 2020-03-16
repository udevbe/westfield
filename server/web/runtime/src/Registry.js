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

import RegistryResource from './RegistryResource'
import RegistryRequests from './RegistryRequests'
import Global from './Global'

/**
 * @implements {RegistryRequests}
 */
class Registry extends RegistryRequests {
  constructor () {
    super()
    /**
     * @type {Array<RegistryResource>}
     * @private
     */
    this._registryResources = []
    /**
     * @type {Object.<number,Global>}
     * @private
     */
    this._globals = {}
    /**
     * @type {number}
     * @private
     */
    this._nextGlobalName = 0xffff0000
  }

  /**
   * Register a global to make it available to clients.
   *
   * @param {Object} implementation
   * @param {string}interface_
   * @param {number}version
   * @param {function(Client,number,number):void}bindCallback callback with Client, id, version arguments
   * @return {Global}
   */
  createGlobal (implementation, interface_, version, bindCallback) {
    const name = ++this._nextGlobalName
    const global = new Global(this, implementation, interface_, version, name, bindCallback)
    this._globals[name] = global
    this._registryResources.forEach(registryResource => registryResource.global(global.name, global.interface_, global.version))
    return global
  }

  /**
   * Unregister a global and revoke it from clients.
   *
   * @param {Global} global
   */
  destroyGlobal (global) {
    if (this._globals[global.name]) {
      this._registryResources.forEach(registryResource => registryResource.globalRemove(global.name))
      setTimeout(()=>{
        delete this._globals[global.name]
      },5000)
    }
  }

  /**
   * @param {RegistryResource} registryResource
   */
  publishGlobals (registryResource) {
    Object.entries(this._globals).forEach(([name, global]) => registryResource.global(Number.parseInt(name), global.interface_, global.version))
  }

  /**
   *
   * @param {Client} client
   * @param {number} id
   */
  createRegistryResource (client, id) {
    const registryResource = new RegistryResource(client, id, 1)
    registryResource.implementation = this
    this._registryResources.push(registryResource)
    return registryResource
  }

  /**
   * Binds a new, client-created object to the server using the
   * specified name as the identifier.
   * @param {Client}client
   * @param {RegistryResource}resource
   * @param {number}name unique numeric name of the object
   * @param {string}interface_
   * @param {number}version
   * @param {number}id bounded object
   * @override
   */
  bind (client, resource, name, interface_, version, id) {
    this._globals[name].bindClient(client, id, version)
  }
}

export default Registry
