const Resource = require('../Resource')
const {newObject} = require('../WireFormat')

class RtcSignalingResource extends Resource {
  /**
   * Notify the client of a new peer connection. A client should wait until it receives a negotiate event before
   * initializing the underlying peer connection.
   *
   * @since 1
   * @return {number} RtcPeerConnectionResource id
   */
  peerConnection () {
    return this.client.marshallConstructor(this.id, 1, [newObject()])
  }

  /**
   *@param {Client}client
   *@param {number}id
   *@param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
    /**
     * @type {RtcSignalingRequests}
     */
    this.implementation = null
  }

  [0] (message) {
    const args = this.client.unmarshallArgs(message, 'o')
    this.implementation.whichPeer(this, ...args)
  }
}

module.exports = RtcSignalingResource
