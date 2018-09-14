'use strict'

const RtcSignalingResource = require('./RtcSignalingResource')
const RtcSignalingRequests = require('./RtcSignalingRequests')
const RtcPeerConnectionResource = require('./RtcPeerConnectionResource')
const ClientServerPeerConnection = require('./ClientServerPeerConnection')

/**
 * @implements {RtcSignalingRequests}
 */
class Signaling extends RtcSignalingRequests {
  constructor () {
    super()
    /**
     * @type {Global|null}
     * @private
     */
    this._global = null

    /**
     * @type {Array<ClientServerPeerConnection>}
     */
    this.clientServerPeerConnections = []
    /**
     * @type {Array<RtcSignalingResource>}
     */
    this.resources = []
  }

  /**
   * @param {Registry}registry
   */
  registerGlobal (registry) {
    if (this._global) {
      return
    }
    this._global = registry.createGlobal(this, RtcSignalingResource.name, 4, (client, id, version) => {
      this.bindClient(client, id, version)
    })
  }

  unregisterGlobal () {
    if (!this._global) {
      return
    }
    this._global.destroy()
    this._global = null
  }

  /**
   *
   * Invoked when a client binds to this global.
   *
   * @param {!Client} client
   * @param {!number} id
   * @param {!number} version
   */
  bindClient (client, id, version) {
    const rtcSignalingResource = new RtcSignalingResource(client, id, version)
    rtcSignalingResource.implementation = this
    this.resources.push(rtcSignalingResource)

  }

  destroy (resource) {
    const idx = this.resources.indexOf(resource)
    if (idx > -1) {
      this.resources.splice(idx, 1)
    }
  }

  /**
   * Ask the rtc signaling which peer connection can be used to receive a blob.
   * This request triggers a canReceive event on the peer connection associated with the provided blob argument.
   * This request may trigger the creation of a new peer connection.
   * @param {RtcSignalingResource} resource
   * @param {BlobResource}blob
   */
  whichPeer (resource, blob) {
  }

  /**
   * @param {Client}client
   * @return {ClientServerPeerConnection|null}
   */
  clientServerPeer (client) {
    const rtcSignalingResource = this.resources.find(resource => { return resource.client === client}) || null
    let clientServerPeerConnection = this.clientServerPeerConnections.find(clientServerPeerConnection => clientServerPeerConnection.resource.client === client) || null

    if (!clientServerPeerConnection && rtcSignalingResource) {
      const rtcPeerConnectionResourceId = rtcSignalingResource.peerConnection()
      const rtcPeerConnectionResource = new RtcPeerConnectionResource(client, rtcPeerConnectionResourceId, rtcSignalingResource.version)
      clientServerPeerConnection = ClientServerPeerConnection.create(rtcPeerConnectionResource)
      this.clientServerPeerConnections.push(clientServerPeerConnection)
      rtcPeerConnectionResource.negotiate()
    }

    return clientServerPeerConnection
  }

  clientClientPeer (client, client) {
    // TODO
  }
}
