'use strict'

const { Endpoint } = require('westfield-native')

class RequestInterceptors {
  /**
   * @param {wl_display_interceptor}wlDisplayInterceptor
   * @returns {RequestInterceptors}
   */
  static create (wlDisplayInterceptor) {
    return new RequestInterceptors(wlDisplayInterceptor)
  }

  constructor (wlDisplayInterceptor) {
    /**
     * @type {Object.<number, Object>}
     */
    this.interceptors = { 1: wlDisplayInterceptor }
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
    }
  }

  /**
   * @param {number}objectId
   * @param {number}opcode
   * @param {ArrayBuffer}message
   * @return {boolean} if message was consumed
   */
  interceptRequest (objectId, opcode, message) {
    const interceptor = this.interceptors[objectId]
    let consumed = false
    if (interceptor) {
      consumed = true
      const interception = interceptor[opcode]
      if (interception) {
        consumed = interception(message)
      }
    }
    return consumed
  }
}