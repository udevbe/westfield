'use strict'

class Global {
  /**
   *
   * @param {Registry}registry
   * @param {Object}implementation
   * @param {string} interface_
   * @param {number} version
   * @param {number}name
   * @param {function(Client,number,number):void}bindCallback
   */
  constructor (registry, implementation, interface_, version, name, bindCallback) {
    /**
     * @type {Registry}
     */
    this.registry = registry
    /**
     * @type {Object}
     */
    this.implementation = implementation
    /**
     * @type {function(Client, number, number): void}
     * @private
     */
    this._bindCallback = bindCallback
    /**
     * @type {string}
     */
    this.interface_ = interface_
    /**
     * @type {number}
     */
    this.version = version
    /**
     * @type {number}
     */
    this.name = name
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding wfs.Resource subtype.
   *
   * @param {Client} client
   * @param {number} id
   * @param {number} version
   */
  bindClient (client, id, version) {
    this._bindCallback(client, id, version)
  }

  destroy () {
    if (this.registry) {
      this.registry.destroyGlobal(this)
      this.registry = null
    }
  }
}

module.exports = Global