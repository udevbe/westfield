'use strict'

const Resource = require('../Resource')
const {string, object} = require('../WireFormat')

class RtcPeerConnectionResource extends Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    super(client, id, version)
    /**
     * @type {RtcPeerConnectionRequests}|null}
     */
    this.implementation = null
  }

  /**
   * Create a new data channel with the provided options. Options is a json dictionary. After a data channel is created,
   * the data represented by the blob resource is send to party that initiated the receive.
   *
   * If an unrelated blob resource is given, a protocol error is raised.
   *
   * @param {BlobResource}blobResource
   * @param {string}dataChannelOptions
   */
  receive (blobResource, dataChannelOptions) {
    this.client.marshall(this.id, 0, [object(blobResource), string[dataChannelOptions]])
  }

  /**
   * Notify the client it may start negotiating the peer connection. If the negotiation is successful, the  peer
   * connection is connected to another rtc peer connection. The other end can either be a server side peer
   * connection, or a peer connection from another client.
   * @since 1
   */
  negotiate () {
    this.client.marshall(this.id, 1, [])
  }

  /**
   *
   * @param {string} description
   *
   * @since 1
   *
   */
  sdpReply (description) {
    this.client.marshall(this.id, 2, [string(description)])
  }

  /**
   *
   * @param {string} description
   *
   * @since 1
   *
   */
  iceCandidates (description) {
    this.client.marshall(this.id, 3, [string(description)])
  }

  /**
   * Notify the client that this peer connection can be used to receive that data associated with the blob.
   * @param blobResource
   */
  canReceive (blobResource) {
    this.client.marshall(this.id, 4, [object(blobResource)])
  }

  /**
   * @since 1
   */
  close () {
    this.client.marshall(this.id, 4, [])
  }

  [0] (message) {
    const args = this.client.unmarshallArgs(message, 'os')
    this.implementation.receive(this, ...args)
  }

  [1] (message) {
    const args = this.client._unmarshallArgs(message, 's')
    this.implementation.iceCandidates(this, ...args)
  }

  [2] (message) {
    const args = this.client._unmarshallArgs(message, 's')
    this.implementation.sdpOffer(this, ...args)
  }

  [3] (message) {
    this.implementation.destroy(this)
  }
}

module.exports = RtcPeerConnectionResource