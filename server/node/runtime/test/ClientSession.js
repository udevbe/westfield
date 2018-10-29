const { Endpoint } = require('westfield-endpoint')

class ClientSession {
  /**
   * @param {Object}wlClient
   * @param {Client}client
   * @param {CompositorSession}compositorSession
   * @returns {ClientSession}
   */
  static create (wlClient, client, compositorSession) {
    const destroyPromise = new Promise(resolve => Endpoint.setClientDestroyedCallback(wlClient, () => resolve()))

    const clientSession = new ClientSession(wlClient, client, compositorSession, destroyPromise)
    Endpoint.setWireMessageCallback(wlClient, (wlClient, message, objectId, opcode, hasNativeResource) => clientSession.onWireMessageRequest(wlClient, message, objectId, opcode, hasNativeResource))
    Endpoint.setWireMessageEndCallback(wlClient, (wlClient, fdsIn) => clientSession.onWireMessageEnd(wlClient, fdsIn))

    client.onFlush = wireMessages => clientSession.onWireMessageEvents(wireMessages)

    Endpoint.setRegistryCreatedCallback(wlClient, (wlRegistry, registryId) => clientSession.onRegistryCreated(wlRegistry, registryId))

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
    // convert to arraybuffer so it can be send over a data channel.
    const messagesSize = wireMessages.reduce((previousValue, currentValue) => {
      previousValue += Uint32Array.BYTES_PER_ELEMENT + (currentValue.fds * Uint32Array.BYTES_PER_ELEMENT) + currentValue.buffer.byteLength
      return previousValue
    }, 0)

    const sendBuffer = new Uint32Array(new ArrayBuffer(messagesSize))

    let offset = 0
    wireMessages.forEach(value => {
      const fds = Uint32Array.from(value.fds)
      const message = new Uint32Array(value.buffer)
      sendBuffer[offset++] = fds.length
      sendBuffer.set(fds, offset)
      offset += fds.length
      sendBuffer.set(message, offset)
      offset += message.length
    })
    // send over data channel

    // receive from data channel
    const receiveBuffer = new Uint32Array(sendBuffer.buffer)
    let readOffset = 0
    let localGlobalsEmitted = false
    while (readOffset < receiveBuffer.length) {
      const fdsCount = receiveBuffer[readOffset++]
      const fdsBuffer = receiveBuffer.subarray(readOffset, readOffset + fdsCount)
      readOffset += fdsCount
      const sizeOpcode = receiveBuffer[readOffset + 1]
      const size = sizeOpcode >>> 16
      const length = size / Uint32Array.BYTES_PER_ELEMENT
      const messageBuffer = receiveBuffer.subarray(readOffset, readOffset + length)
      readOffset += length

      if (!localGlobalsEmitted) {
        localGlobalsEmitted = this._emitLocalGlobals(messageBuffer)
      }

      Endpoint.sendEvents(
        this.wlClient,
        messageBuffer.buffer.slice(messageBuffer.byteOffset, messageBuffer.byteOffset + messageBuffer.byteLength),
        fdsBuffer.buffer.slice(fdsBuffer.byteOffset, fdsBuffer.byteOffset + fdsBuffer.byteLength)
      )
    }

    Endpoint.flush(this.wlClient)
  }

  /**
   * @param {Uint32Array}wireMessageBuffer
   * @returns {boolean}
   * @private
   */
  _emitLocalGlobals (wireMessageBuffer) {
    const id = wireMessageBuffer[0]
    const wlRegistry = this._wlRegistries[id]
    if (wlRegistry) {
      const sizeOpcode = wireMessageBuffer[1]
      const messageOpcode = sizeOpcode & 0x0000FFFF
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
   * @param {number}id
   * @param {number}opcode
   * @param {ArrayBuffer}message
   * @private
   */
  _isRemoteGlobalBind (id, opcode, message) {
    const wlRegistry = this._wlRegistries[id]
    let isRemoteGlobal = false
    if (wlRegistry) {
      const bindOpcode = 0
      if (opcode === bindOpcode) {
        const args = this.parse(id, bindOpcode, 'usun', message)
        const globalName = args[0]
        isRemoteGlobal = !this._compositorSession.localGlobalNames.includes(globalName)
      }
    }
    return isRemoteGlobal
  }

  /**
   * @param {Object}wlClient
   * @param {ArrayBuffer}message
   * @param {number}objectId
   * @param {number}opcode
   * @param {boolean}hasNativeResource
   * @returns {number}
   */
  onWireMessageRequest (wlClient, message, objectId, opcode, hasNativeResource) {
    // If the resource exist locally, we don't want to delegate it to the browser. Except:
    //  - If the resource is 'display' and the request is 'get_registry', then the request should be happen
    // both locally & in the browser.
    //  - If the resource is 'display' and the request is 'sync', then the request should be happen both locally & in the browser.
    //  - If a bind request happens on a registry resource for a locally created global, then don't delegate to the browser.
    // If none of the above applies, delegate to browser.

    // by default, always consume the message & delegate to browser
    let consumed = 1

    // if there is a native resource and the request is not a bind to a remote global or a sync, then there are some special cases that apply.
    if (hasNativeResource &&
      !this._isSync(objectId, opcode) &&
      !this._isRemoteGlobalBind(objectId, opcode, message)) {
      if (this._isGetRegistry(objectId, opcode)) {
        // if the resource is 'display' and the request is 'get_registry', then the request should be happen
        // both locally & in the browser.
        consumed = 0
      } else {
        // if none of the above conditions apply, then let the local resource implementation handle the request
        return 0
      }
    }

    // TODO analyse wire message to check for compositor requests & track the surface id.

    this._pendingMessageBufferSize += message.byteLength
    this._pendingWireMessages.push(message)

    return consumed
  }

  /**
   * @param {Object}wlClient
   * @param {ArrayBuffer}fdsIn
   */
  onWireMessageEnd (wlClient, fdsIn) {
    const fdsBufferSize = Uint32Array.BYTES_PER_ELEMENT + (fdsIn ? fdsIn.byteLength : 0)
    const sendBuffer = new Uint32Array(new ArrayBuffer(fdsBufferSize + this._pendingMessageBufferSize))
    let offset = 0
    sendBuffer[0] = fdsIn ? fdsIn.byteLength / Uint32Array.BYTES_PER_ELEMENT : 0
    offset += 1

    if (fdsIn) {
      const fdsArray = new Uint32Array(fdsIn)
      sendBuffer.set(fdsArray)
      offset += fdsArray.length
    }

    this._pendingWireMessages.forEach(value => {
      const wireMessage = new Uint32Array(value)
      sendBuffer.set(wireMessage, offset)
      offset += wireMessage.length
    })
    // send sendBuffer.buffer over data channel

    // read buffer from data Channel
    const receiveBuffer = new Uint32Array(sendBuffer.buffer)
    const fdsInCount = receiveBuffer[0]
    const fds = receiveBuffer.subarray(1, 1 + fdsInCount)
    const buffer = receiveBuffer.subarray(1 + fdsInCount)

    this.client.message({ buffer, fds })
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
   * @param {number}objectId
   * @param {number}opcode
   * @returns {boolean}
   * @private
   */
  _isGetRegistry (objectId, opcode) {
    const displayId = 1
    const getRegistryOpcode = 1
    return objectId === displayId && opcode === getRegistryOpcode
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @returns {boolean}
   * @private
   */
  _isSync (objectId, opcode) {
    const displayId = 1
    const syncOpcode = 0
    return objectId === displayId && opcode === syncOpcode
  }
}

module.exports = ClientSession