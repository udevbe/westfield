'use strict'

const RtcPeerConnectionRequests = require('./RtcPeerConnectionRequests')

/**
 * @implements {RtcPeerConnectionRequests}
 */
class ClientServerPeerConnection extends RtcPeerConnectionRequests {
  /**
   * @param {RtcPeerConnectionResource}rtcPeerConnectionResource
   * @return {ClientServerPeerConnection}
   */
  static create (rtcPeerConnectionResource) {
    const rtcPeerConnection = new RTCPeerConnection()
    const peerConnection = new ClientServerPeerConnection(rtcPeerConnectionResource, rtcPeerConnection)
    rtcPeerConnectionResource.implementation = peerConnection
    return peerConnection
  }

  /**
   * @param {RtcPeerConnectionResource}resource
   * @param {RTCPeerConnection}rtcPeerConnection
   */
  constructor (resource, rtcPeerConnection) {
    super()
    /**
     * @type {RtcPeerConnectionResource}
     */
    this.resource = resource
    /**
     * @type {RTCPeerConnection}
     */
    this.rtcPeerConnection = rtcPeerConnection
  }

  destroy (resource) {
    // TODO destroy all underlying resources first(?)
  }

  async iceCandidates (resource, description) {
  }

  receive (resource, blobResource, dataChannelOptions) {
  }

  async sdpOffer (resource, description) {

  }

  async sdpReply (resource, description) {
  }
}

module.exports = ClientServerPeerConnection
