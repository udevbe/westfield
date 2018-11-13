'use strict'

const { Endpoint } = require('westfield-native')

class MessageInterceptor {
  /**
   * @param {Object}wlClient
   * @param {Object}wlDisplay
   * @param {wl_display_interceptor.constructor}wlDisplayInterceptorConstructor
   * @returns {MessageInterceptor}
   */
  static create (wlClient, wlDisplay, wlDisplayInterceptorConstructor) {
    const interceptors = {}
    interceptors[1] = new wlDisplayInterceptorConstructor(wlClient, interceptors, 1, wlDisplay)
    return new MessageInterceptor(interceptors)
  }

  /**
   * @param {Object.<number, Object>}interceptors
   */
  constructor (interceptors) {
    /**
     * @type {Object.<number, Object>}
     */
    this.interceptors = interceptors
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {Uint32Array}messageBuffer
   */
  handleEvent (objectId, opcode, messageBuffer) {
    if (objectId === 1 && opcode === 2) {
      const deleteObjectId = messageBuffer[2]
      const interceptor = this.interceptors[deleteObjectId]
      Endpoint.destroyWlResourceSilently(interceptor.wlResource)
      delete this.interceptors[deleteObjectId]
      return
    }

  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}}message
   * @return {number} where the message should be send to. 0 = browser only, 1 native only, 2 both.
   */
  interceptRequest (objectId, opcode, message) {
    const interceptor = this.interceptors[objectId]
    let destination = 1
    if (interceptor) {
      destination = 0
      const interception = interceptor[opcode]
      if (interception) {
        destination = interception.call(interceptor, message)
      }
    }
    return destination
  }
}

module.exports = MessageInterceptor