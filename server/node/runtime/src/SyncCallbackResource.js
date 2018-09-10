'use strict'

const Resource = require('./Resource')
const {uint} = require('./WireFormat')

class SyncCallbackResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
  }

  /**
   *
   * Notify the client when the related request is done.
   *
   *
   * @param {number} callbackData request-specific data for the callback
   *
   * @since 1
   *
   */
  done (callbackData) {
    this.client.marshall(this.id, 1, [uint(callbackData)])
  }
}

module.exports = SyncCallbackResource