'use strict'

/**
 * @interface
 */
class RegistryRequests {
  /**
   *  Binds a new, client-created object to the server using the
   * specified name as the identifier.
   * @param {Client}client
   * @param {RegistryResource}resource
   * @param {number}name unique numeric name of the object
   * @param {string}interface_
   * @param {number}version
   * @param {number}id bounded object
   */
  bind (client, resource, name, interface_, version, id) {}
}

module.exports = RegistryRequests
