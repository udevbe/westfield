const {Endpoint} = require('westfield-endpoint')

class ClientSession {
  /**
   * @param {Object}wlClient
   * @param {Client}client
   * @returns {ClientSession}
   */
  static create (wlClient, client) {
    const destroyPromise = new Promise((resolve) => {
      Endpoint.setClientDestroyedCallback(wlClient, () => {
        resolve()
      })
    })

    const clientSession = new ClientSession(wlClient, client, destroyPromise)
    Endpoint.setWireMessageCallback(wlClient, async (wlClient, messages, fdsIn) => {
      await clientSession.onWireMessage(wlClient, messages, fdsIn)
    })

    client.onFlush =
      /**
       * @param {Array<{buffer: ArrayBuffer, fds: Array<number>}>}wireMessages
       */
        (wireMessages) => {
        wireMessages.forEach((wireMessage) => {
          const fds = new Uint32Array(wireMessage.fds).buffer
          Endpoint.sendEvents(wlClient, wireMessage.buffer, fds)
        })
        Endpoint.flush(wlClient)
      }

    return clientSession
  }

  /**
   * @param {Object}wlClient
   * @param {Client}client
   * @param {Promise<void>}destroyPromise
   */
  constructor (wlClient, client, destroyPromise) {
    /**
     * @type {Object}
     */
    this.wlClient = wlClient
    /**
     * @type {Client}
     */
    this.client = client
    /**
     * @type {Promise<void>}
     * @private
     */
    this._destroyPromise = destroyPromise
  }

  /**
   * @param {Object}wlClient
   * @param {ArrayBuffer}messages
   * @param {ArrayBuffer}fdsIn
   * @returns {number}
   */
  async onWireMessage (wlClient, messages, fdsIn) {
    const fds = []
    if (fdsIn) {
      new Int32Array(fdsIn).forEach((fd) => {
        fds.push(fd)
      })
    }

    await this.client.message({
      buffer: messages,
      fds: fds
    })
    return 1
  }

  /**
   * @return {Promise<void>}
   */
  onDestroy () {
    return this._destroyPromise
  }
}

module.exports = ClientSession