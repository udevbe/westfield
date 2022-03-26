'use strict'

const { Endpoint } = require('./westfield-native')

class MessageInterceptor {
  /**
   * @param {Object}wlClient
   * @param {Object}wlDisplay
   * @param {wl_display_interceptor.constructor}wlDisplayInterceptorConstructor
   * @param {*}userData
   * @returns {MessageInterceptor}
   */
  static create(wlClient, wlDisplay, wlDisplayInterceptorConstructor, userData) {
    const interceptors = {}
    interceptors[1] = new wlDisplayInterceptorConstructor(wlClient, interceptors, 1, wlDisplay, userData)
    return new MessageInterceptor(interceptors)
  }

  /**
   * @param {Object.<number, Object>}interceptors
   */
  constructor(interceptors) {
    /**
     * @type {Object.<number, Object>}
     */
    this.interceptors = interceptors
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {{buffer: ArrayBuffer, fds: Array, bufferOffset: number, consumed: number, size: number}}message
   * @return {number} where the message should be send to. 0 = browser only, 1 native only, 2 both.
   */
  interceptRequest(objectId, opcode, message) {
    const interceptor = this.interceptors[objectId]
    let destination = 1
    if (interceptor) {
      destination = 0
      const interception = interceptor[`R${opcode}`]
      if (interception) {
        destination = interception.call(interceptor, message)
      }
    }
    return destination
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {{buffer: ArrayBuffer, fds: Array, bufferOffset: number, consumed: number, size: number}}message
   */
  interceptEvent(objectId, opcode, message) {
    const interceptor = this.interceptors[objectId]
    if (interceptor) {
      const interception = interceptor[`E${opcode}`]
      if (interception) {
        interception.call(interceptor, message)
      }
    }
  }
}

module.exports = MessageInterceptor
