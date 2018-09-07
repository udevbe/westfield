'use strict'

/**
 * @interface
 */
class DisplayRequests {
  /**
   * @param {DisplayResource}resource
   * @param {number}id
   */
  sync (resource, id) {}
  /**
   * @param {DisplayResource}resource
   * @param {number}id
   */
  getRegistry (resource, id) {}
}

module.exports = DisplayRequests