'use strict'

const Resource = require('./Resource')
const {uint, string} = require('./WireFormat')

// TODO match wayland registry api/protocol
class RegistryResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   * @param {RegistryRequests}implementation
   */
  constructor (client, id, version, implementation) {
    super(client, id, version, implementation)
  }

  /**
   * @return {RegistryRequests}
   */
  get implementation () {
    return this._implementation
  }

  /**
   * @param {Number} name
   * @param {String} interface_
   * @param {Number} version
   */
  global (name, interface_, version) {
    this.client._marshall(this.id, 1, [uint(name), string(interface_), uint(version)])
  }

  /**
   * Notify the client that the global with the given name id is removed.
   * @param {Number} name
   */
  globalRemove (name) {
    this.client._marshall(this.id, 2, [wfs._uint(name)])
  }

  /**
   * opcode 1 -> bind
   *
   * @param {ArrayBuffer} message
   */
  [1] (message) {
    const args = this.client.unmarshallArgs(message, 'usun')
    this.implementation.bind(this.client, this, args[0], args[1], args[2], args[3])
  }
}

module.exports = RegistryResource