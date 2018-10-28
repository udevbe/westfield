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

    compositorSession.wlDisplay = Endpoint.createDisplay(
      (wlClient) => {
        return compositorSession._onClientCreated(wlClient)
      },
      (globalName) => {
        return compositorSession._onGlobalCreated(globalName)
      },
      (globalName) => {
        return compositorSession._onGlobalDestroyed(globalName)
      }
    )
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
    this.clientSessions = []
    /**
     * List of globals created on the native machine by 3rd party protocol implementations.
     * @type {Array<number>}
     */
    this.localGlobalNames = []
  }

  /**
   * @param {Object}wlClient
   * @private
   */
  _onClientCreated (wlClient) {
    // TODO keep track of clients
    const client = this.display.createClient()
    const clientSession = ClientSession.create(wlClient, client, this)
    this.clientSessions.push(clientSession)
    clientSession.onDestroy().then(() => {
      const idx = this.clientSessions.indexOf(clientSession)
      if (idx > -1) {
        this.clientSessions.splice(idx, 1)
      }
    })
  }

  /**
   * @param {number}globalName
   * @private
   */
  _onGlobalCreated (globalName) {
    this.localGlobalNames.push(globalName)
  }

  /**
   * @param {number}globalName
   * @private
   */
  _onGlobalDestroyed (globalName) {
    const idx = this.localGlobalNames.indexOf(globalName)
    if (idx > -1) {
      this.localGlobalNames.splice(idx, 1)
    }
  }
}

module.exports = CompositorSession