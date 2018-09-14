'use strict'

const BlobRequests = require('../blob/BlobRequests')

/**
 * @implements {BlobRequests}
 */
class RtcBlob extends BlobRequests {

  /**
   * @param {BlobResource}blobResource
   * @param {ArrayBuffer|null}arrayBuffer
   * @private
   */
  constructor (blobResource, arrayBuffer) {
    super()
    /**
     * @type {BlobResource}
     */
    this.resource = blobResource
    /**
     * @type {ArrayBuffer|null}
     */
    this.data = arrayBuffer
  }

  destroy (resource) {
    resource.destroy()
  }

  close () {
    this.resource.close()
  }
}

module.exports = RtcBlob
