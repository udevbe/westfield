'use strict'

const Resource = require('./Resource')

// TODO match wayland display api/protocol
// TODO generate display resource from protocol xml
class DisplayResource extends Resource {
  constructor (client, id, version) {
    super(client, id, version, {
      getRegistry (resource, id) {}
      // TODO sync
    })
  }

  /**
   * opcode 1 -> getRegistry
   *
   * @param {ArrayBuffer} message
   */
  [1] (message) {
    const args = this.client._unmarshallArgs(message, 'n')
    this.implementation.getRegistry.call(this.implementation, this, args[0])
  }
}

module.exports = DisplayResource