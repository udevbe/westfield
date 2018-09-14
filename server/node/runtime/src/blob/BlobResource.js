'use strict'

const Resource = require('../Resource')

class BlobResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
    /**
     * @type {BlobRequests|null}
     */
    this.implementation = null
  }

  /**
   * Nofifies the client this blob will not be used anymore by the server.
   */
  close () {
    this.client.marshall(this.id, 0, [])
  }

  [0] (message) {
    this.implementation.destroy(this)
  }
}

module.exports = BlobResource
