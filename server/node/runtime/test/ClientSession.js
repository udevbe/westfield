const {Endpoint} = require('westfield-endpoint')

class ClientSession {
  /**
   * @param {Object}wlClient
   * @param {Client}client
   * @param {CompositorSession}compositorSession
   * @returns {ClientSession}
   */
  static create (wlClient, client, compositorSession) {
    const destroyPromise = new Promise((resolve) => {
      Endpoint.setClientDestroyedCallback(wlClient, () => {
        resolve()
      })
    })

    const clientSession = new ClientSession(wlClient, client, compositorSession, destroyPromise)
    Endpoint.setWireMessageCallback(wlClient, (wlClient, messages, fdsIn) => {
      return clientSession.onWireMessageRequest(wlClient, messages, fdsIn)
    })

    client.onFlush = (wireMessages) => {
      // Here the client would use a network channel to send the wire messages
      return clientSession.onWireMessageEvents(wireMessages)
    }

    Endpoint.setRegistryCreatedCallback(wlClient,
      (wlRegistry, registryId) => {
        return clientSession.onRegistryCreated(wlRegistry, registryId)
      })

    return clientSession
  }

  /**
   * @param {Object}wlClient
   * @param {Client}client
   * @param {CompositorSession}compositorSession
   * @param {Promise<void>}destroyPromise
   */
  constructor (wlClient, client, compositorSession, destroyPromise) {
    /**
     * @type {Object}
     */
    this.wlClient = wlClient
    /**
     * @type {Client}
     */
    this.client = client
    /**
     * @type {CompositorSession}
     * @private
     */
    this._compositorSession = compositorSession
    /**
     * @type {Promise<void>}
     * @private
     */
    this._destroyPromise = destroyPromise
    /**
     * @type {Array<ArrayBuffer>}
     * @private
     */
    this._pendingWireMessages = []
    this._pendingMessageBufferSize = 0
    this._pendingFds = []

    /**
     * @type {Object.<number, Object>}
     * @private
     */
    this._wlRegistries = {}
  }

  /**
   * @param {Array<{buffer: ArrayBuffer, fds: Array<number>}>}wireMessages
   */
  onWireMessageEvents (wireMessages) {
    let localGlobalsEmitted = false
    wireMessages.forEach((wireMessage) => {
      if (!localGlobalsEmitted) {
        localGlobalsEmitted = this._emitLocalGlobals(wireMessage.buffer)
      }
      const fds = new Uint32Array(wireMessage.fds).buffer
      Endpoint.sendEvents(this.wlClient, wireMessage.buffer, fds)
    })
    Endpoint.flush(this.wlClient)
  }

  /**
   * @param {ArrayBuffer}wireMessageBuffer
   * @returns {boolean}
   * @private
   */
  _emitLocalGlobals (wireMessageBuffer) {
    const id = new Uint32Array(wireMessageBuffer)[0]
    const wlRegistry = this._wlRegistries[id]
    if (wlRegistry) {
      const messageOpcode = bufu16[0]
      const globalOpcode = 0
      if (messageOpcode === globalOpcode) {
        Endpoint.emitGlobals(wlRegistry)
        return true
      }
    }
    return false
  }

  /**
   *
   * @param {ArrayBuffer}message
   * @private
   */
  _isLocalGlobalBind (message) {
    const id = new Uint32Array(message)[0]
    const wlRegistry = this._wlRegistries[id]
    let isLocalGlobal = false
    if (wlRegistry) {
      const messageOpcode = bufu16[0]
      const bindOpcode = 0
      if (messageOpcode === bindOpcode) {
        const args = this.parse(id, bindOpcode, 'usun', message)
        const globalName = args[0]
        isLocalGlobal = this._compositorSession.localGlobalNames.includes(globalName)
      }
    }
    return isLocalGlobal
  }

  /**
   * @param {Object}wlClient
   * @param {ArrayBuffer}message
   * @param {ArrayBuffer}allFdsIn
   * @returns {number}
   */
  onWireMessageRequest (wlClient, message, allFdsIn) {
    let consumed = 1
    // if wire message is a bind to a locally created global, then delegate the message and don't send it to the remote compositor.
    if (this._isLocalGlobalBind(message)) {
      // return early, no need to delegate this message to the browser
      return 0
    }

    if (this._isGetRegistry(message)) {
      // make sure the local registry is created, don't consume the message
      consumed = 0
    }
    // TODO analyse wire message to check for compositor requests & track the surface id.

    // We can't get the file descriptors per message, only all of them at once. So we just add all of them for each
    // message. This will result in us sending too much file descriptors on flush, however this is functionally not a
    // problem.
    if (allFdsIn) {
      new Int32Array(allFdsIn).forEach((fd) => {
        this._pendingFds.push(fd)
      })
    }

    this._pendingMessageBufferSize += message.byteLength
    this._pendingWireMessages.push(message)

    return consumed
  }

  flush () {
    const sendBuffer = new Uint8Array(this._pendingMessageBufferSize)
    this._pendingMessageBufferSize = 0

    let offset = 0
    this._pendingWireMessages.forEach((wireMessage) => {
      sendBuffer.set(new Uint8Array(wireMessage), offset)
      offset += wireMessage.byteLength
    })
    this._pendingWireMessages = []

    const messageFds = this._pendingFds.slice()
    this._pendingFds = []

    // here we would use a network channel to send the data to the browser, while
    // on the receiving end of the network channel we would call client.message(..)
    this.client.message({
      buffer: sendBuffer.buffer,
      fds: messageFds
    })
  }

  /**
   * Returns the arguments parsed from the wire messages, or null if no matches are found. Does not support signature
   * with file descriptors.
   *
   * @param {number}objectId
   * @param {number}opcode
   * @param {string}signature
   * @param {ArrayBuffer}wireMessageBuffer
   * @returns {null|Array<*>}
   */
  parse (objectId, opcode, signature, wireMessageBuffer) {
    const id = new Uint32Array(wireMessageBuffer)[0]
    const bufu16 = new Uint16Array(wireMessageBuffer, 4)
    const size = bufu16[1]
    if (size > wireMessageBuffer.byteLength) {
      throw new Error('wireMessageBuffer too small')
    }
    const messageOpcode = bufu16[0]
    if (objectId === id && opcode === messageOpcode) {
      return this.client.unmarshallArgs({
        buffer: wireMessageBuffer,
        bufferOffset: 0,
        consumed: 8,
        fds: [],
        size: size
      }, signature)
    } else {
      return null
    }
  }

  /**
   * @return {Promise<void>}
   */
  onDestroy () {
    return this._destroyPromise
  }

  /**
   * @param {Object}wlRegistry
   * @param {number}registryId
   */
  onRegistryCreated (wlRegistry, registryId) {
    this._wlRegistries[registryId] = wlRegistry


    Endpoint.emitGlobals(wlRegistry)
  }

  /**
   * @param {ArrayBuffer}message
   * @returns {boolean}
   * @private
   */
  _isGetRegistry (message) {
    let isGetRegistry = false

    const id = new Uint32Array(message)[0]
    if (id === 1) {
      const bufu16 = new Uint16Array(message, 4)
      const messageOpcode = bufu16[0]
      const getRegistryOpcode = 1
      isGetRegistry = messageOpcode === getRegistryOpcode
    }
    return isGetRegistry
  }
}

module.exports = ClientSession