'use strict'

/**
 * @interface
 */
class RtcSignalingRequests {

  /**
   * Ask the rtc signaling which peer connection can be used to receive a blob.
   * This request triggers a canReceive event on the peer connection associated with the provided blob argument.
   * This request may trigger the creation of a new peer connection.
   *
   * @param {RtcSignalingResource} resource
   * @param {BlobResource}blob
   *
   * @since 1
   *
   */
  whichPeer (resource, blob) {}

  /**
   *
   * @param {RtcSignalingResource} resource
   *
   * @since 1
   *
   */
  destroy (resource) {}
}

module.exports = RtcSignalingRequests
