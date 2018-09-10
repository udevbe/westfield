'use strict'

const {uint, string} = require('./WireFormat')

class Resource {
  /**
   * @param {Client}client
   * @param {number}id
   * @param {number}version
   */
  constructor (client, id, version) {
    /**
     * @type {Client}
     */
    this.client = client
    /**
     * @type {number}
     */
    this.id = id
    /**
     * @type {number}
     */
    this.version = version
    /**
     * Arbitrary data that can be attached to the resource.
     * @type {{}}
     */
    this.userData = {}
    /**
     * @type {Promise<void>}
     * @private
     */
    this._destroyPromise = new Promise((resolve) => {
      this._destroyResolver = resolve
    })
    /**
     * @type {Array<function(Resource):void>}
     * @private
     */
    this._destroyListeners = []
    this._destroyPromise.then(() => {
      this._destroyListeners.forEach((destroyListener) => destroyListener(this))
    })

    this.client.registerResource(this)
  }

  /**
   *
   * @param {number} code
   * @param {string} msg
   */
  postError (code, msg) {
    this.client._marshall(this.id, 0, [uint(code), string(msg)])
  }

  destroy () {
    this._destroyResolver(this)
    this.client.unregisterResource(this)
  }

  /**
   * @param {function(Resource):void}destroyListener
   */
  addDestroyListener (destroyListener) {
    this._destroyListeners.push(destroyListener)
  }

  /**
   * @param {function(Resource):void}destroyListener
   */
  removeDestroyListener (destroyListener) {
    this._destroyListeners = this._destroyListeners.filter((item) => { return item !== destroyListener })
  }

  /**
   * @return {Promise<void>}
   */
  onDestroy () {
    return this._destroyPromise
  }
}

module.exports = Resource