'use strict'

const Resource = require('./Resource')
const {uint, object, string} = require('./WireFormat')

class DisplayResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   * @param {DisplayRequests}implementation
   */
  constructor (client, id, version, implementation) {
    super(client, id, version, implementation)
  }

  /**
   * @return {DisplayRequests}
   */
  get implementation () {
    return this._implementation
  }

  /**
   * opcode 1 -> sync
   *
   * @param {ArrayBuffer} message
   */
  [1] (message) {
    const args = this.client.unmarshallArgs(message, 'n')
    this.implementation.sync(this, args[0])
  }

  /**
   * opcode 2 -> getRegistry
   *
   * @param {ArrayBuffer} message
   */
  [2] (message) {
    const args = this.client.unmarshallArgs(message, 'n')
    this.implementation.getRegistry(this, args[0])
  }

  /**
   *  The error event is sent out when a fatal (non-recoverable)
   *  error has occurred.  The object_id argument is the object
   *  where the error occurred, most often in response to a request
   *  to that object.  The code identifies the error and is defined
   *  by the object interface.  As such, each interface defines its
   *  own set of error codes.  The message is a brief description
   *  of the error, for (debugging) convenience.
   *
   * @param {Resource}errorObject object where the error occurred
   * @param {number}code error code
   * @param {string}message error description
   */
  error (errorObject, code, message) {
    this.client.marshall(this.id, 1, [object(errorObject), uint(code), string(message)])
  }

  /**
   *  This event is used internally by the object ID management
   *  logic.  When a client deletes an object, the server will send
   *  this event to acknowledge that it has seen the delete request.
   *  When the client receives this event, it will know that it can
   *  safely reuse the object ID.
   *
   * @param {number}id deleted object ID
   */
  deleteId (id) {
    this.client.marshall(this.id, 2, [uint(id)])
  }
}

module.exports = DisplayResource