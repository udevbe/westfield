'use strict'

class Global {
  /**
   *
   * @param {string} interfaceName
   * @param {number} version
   */
  constructor (interfaceName, version) {
    /**
     * @type {string}
     */
    this.interfaceName = interfaceName
    /**
     * @type {number}
     */
    this.version = version
    /**
     * @type {number}
     */
    this._name = 0
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
  bindClient (client, id, version) {}
}

module.exports = Global