'use strict'

const Resource = require('./Resource')
const {uint, string} = require ('./WireFormat')

// TODO match wayland registry api/protocol
// TODO generatea registery api from protocol xml
class RegistryResource extends Resource {
  constructor (client, id, version) {
    super(client, id, version, {})
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
    const args = this.client._unmarshallArgs(message, 'uuu')
    this.implementation._globals.get(args[0]).bindClient(this.client, args[1], args[2])
  }
}

module.exports = RegistryResource