'use strict'

const Client = require('./Client')
const Registry = require('./Registry')

class Display {
  constructor () {
    /**
     * @type {Registry}
     */
    this.registry = new Registry()
    /**
     * @type {Array<Client>}
     */
    this.clients = []
    /*
     * IDs allocated by the client are in the range [1, 0xfeffffff] while IDs allocated by the server are
     * in the range [0xff000000, 0xffffffff]. The 0 ID is reserved to represent a null or non-existent object
     */
    /**
     * @type {number}
     */
    this.nextId = 0xff000000
  }

  /**
   * Next server side object id.
   * @return {number}
   */
  getNextObjectId () {
    return ++this.nextId
  }

  /**
   *
   * Invoked when a client binds to this global. Subclasses implement this method so they can instantiate a
   * corresponding wfs.Resource subtype.
   *
   */
  createClient () {
    const client = new Client(this)
    client.onClose().then(() => {
      const idx = this.clients.indexOf(client)
      if (idx > -1) {
        this.clients.splice(idx, 1)
      }
    })
    this.clients.push(client)
    return client
  }

  flushClients () {
    this.clients.forEach(client => {
      client.flush()
    })
  }
}

module.exports = Display