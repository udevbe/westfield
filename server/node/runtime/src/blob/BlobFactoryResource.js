'use strict'
const Resource = require('../Resource')
const {newObject} = require('../WireFormat')

class BlobFactoryResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
    /**
     * @type {BlobFactoryRequests|null}
     */
    this.implementation = null
  }

  blob () {
    this.client.marshallConstructor(this.id, 0, [newObject()])
  }

  [0] (message) {
    const args = this.client.unmarshallArgs(message, 'n')
    this.implementation.blob(this, ...args)
  }
}
