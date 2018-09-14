'use strict'

/**
 * @interface
 */
class RtcPeerConnectionRequests {
  /**
   *
   * @param {RtcSignalingResource} resource
   * @param {string} description
   *
   * @since 1
   *
   */
  iceCandidates (resource, description) {}

  /**
   *
   * @param {RtcSignalingResource} resource
   * @param {string} description
   *
   * @since 1
   *
   */
  sdpOffer (resource, description) {}

  /**
   *
   * @param {RtcSignalingResource} resource
   * @param {string} description
   *
   * @since 1
   *
   */
  sdpReply (resource, description) {}

  /**
   * Create a new data channel with the provided options. Options is a json dictionary. After a data channel is created,
   * the data represented by the blob resource is send to party that initiated the receive.
   *
   * If an unrelated blob resource is given, a protocol error is raised.
   *
   * @param {RtcSignalingResource} resource
   * @param {BlobResource}blobResource
   * @param {string}dataChannelOptions
   */
  receive (resource, blobResource, dataChannelOptions) {}

  /**
   * @param {RtcPeerConnectionRequests}resource
   */
  destroy (resource) {}
}

module.exports = RtcPeerConnectionRequests
