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
   * @return {number}
   */
  getNextId () {
    return ++this.nextId
  }

  /**
   * @return {Client}
   */
  bindClient () {
    const client = new Client(this)
    this.clients.push(client)
    return client
  }
}

module.exports = Display