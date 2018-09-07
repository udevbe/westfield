'use strict'

const RegistryResource = require('./RegistryResource')
const RegistryRequests = require('./RegistryRequests')

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
    this._nextGlobalName = 0
  }

  /**
   * Register a global to make it available to clients.
   *
   * @param {Global} global
   */
  register (global) {
    if (!(global._name)) {
      global._name = ++this._nextGlobalName
    }
    if (!this._globals[global._name]) {
      this._globals[global._name] = global
      this._registryResources.forEach(registryResource => registryResource.global(global._name, global.interfaceName, global.version))
    }
  }

  /**
   * Unregister a global and revoke it from clients.
   *
   * @param {Global} global
   */
  unregister (global) {
    if (this._globals[global._name]) {
      delete this._globals[global._name]
      this._registryResources.forEach(registryResource => registryResource.globalRemove(global._name))
    }
  }

  /**
   * @param {RegistryResource} registryResource
   */
  publishGlobals (registryResource) {
    Object.entries(this._globals).forEach((global, name) => registryResource.global(name, global.interfaceName, global.version))
  }

  /**
   *
   * @param {Client} client
   * @param {number} id
   */
  createRegistryResource (client, id) {
    const registryResource = new RegistryResource(client, id, 1, this)
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

module.exports = Registry