'use strict'

/**
 * @interface
 */
class BlobRequests {
  /**
   * Notifies the server this blob will no longer be used by the client. The server should respond by destroying the
   * blob resource.
   * @param {BlobResource}resource
   */
  destroy (resource) {}
}

module.exports = BlobRequests
