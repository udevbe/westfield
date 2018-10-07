const {Display} = require('../index')
const {Endpoint} = require('westfield-endpoint')
const {Epoll} = require('epoll')

const ClientSession = require('./ClientSession')

class CompositorSession {
  /**
   * @returns {CompositorSession}
   */
  static create () {
    const display = new Display()
    const compositorSession = new CompositorSession(display)

    compositorSession.wlDisplay = Endpoint.createDisplay((wlClient) => {
      compositorSession.onClientCreated(wlClient)
    })
    Endpoint.initShm(compositorSession.wlDisplay)
    compositorSession.wlDisplayName = Endpoint.addSocketAuto(compositorSession.wlDisplay)
    compositorSession.wlDisplayFd = Endpoint.getFd(compositorSession.wlDisplay)

    const fdWatcher = new Epoll((err) => {
      Endpoint.dispatchRequests(compositorSession.wlDisplay)
    })
    fdWatcher.add(compositorSession.wlDisplayFd, Epoll.EPOLLPRI | Epoll.EPOLLIN | Epoll.EPOLLERR)

    return compositorSession
  }

  /**
   * @param {Display}display
   */
  constructor (display) {
    /**
     * @type {Display}
     */
    this.display = display
    /**
     * @type {Object}
     */
    this.wlDisplay = null
    /**
     * @type {string}
     */
    this.wlDisplayName = null
    /**
     * @type {number}
     */
    this.wlDisplayFd = -1
    /**
     * @type {Array<ClientSession>}
     */
    this.clients = []
  }

  onClientCreated (wlClient) {
    // TODO keep track of clients
    const client = this.display.createClient()
    const clientSession = ClientSession.create(wlClient, client)
    this.clients.push(clientSession)
    clientSession.onDestroy().then(() => {
      const idx = this.clients.indexOf(clientSession)
      if (idx > -1) {
        this.clients.splice(idx, 1)
      }
    })
  }
}

module.exports = CompositorSession