const assert = require('assert')
const sinon = require('sinon')

const util = require('util')
const execFile = util.promisify(require('child_process').execFile)

const {Epoll} = require('epoll')

const CompositorEndPoint = require('../src/CompositorEndpoint')

describe('CompositorEndpoint', () => {
  describe('display lifecycle', () => {
    it('should be able to start and stop a compositor endpoint using the underlying wl_display struct', () => {
      // given
      const onClientCreated = sinon.fake()
      const onClientDestroyed = sinon.fake()
      const onWireMessage = sinon.fake()
      const compositorEndpoint = CompositorEndPoint.create()

      // when
      const wlDisplay = compositorEndpoint.createDisplay(onClientCreated, onClientDestroyed, onWireMessage)
      compositorEndpoint.destroyDisplay(wlDisplay)

      // then
      assert(wlDisplay)
    })
  })

  describe('client lifecycle', () => {
    it('should be able to handle incoming client connections', async () => {
      // given
      const onClientCreated = (wlClient) => {
        console.log(wlClient)
      }
      const onClientDestroyed = (wlClient) => {
        console.log(wlClient)
      }
      const onWireMessage = (wlClient, message, fdsIn) => {
        console.log(wlClient, message, fdsIn)
      }
      const compositorEndpoint = CompositorEndPoint.create()
      const wlDisplay = compositorEndpoint.createDisplay(onClientCreated, onClientDestroyed, onWireMessage)
      const wlDislayName = compositorEndpoint.addSocketAuto(wlDisplay)
      const wlDisplayFd = compositorEndpoint.getFd(wlDisplay)

      const fdWatcher = new Epoll((err, fd, events) => {
        if (err) {
          throw new Error(err)
        } else {
          compositorEndpoint.dispatchRequests(wlDisplay)
        }
      })
      fdWatcher.add(wlDisplayFd, Epoll.EPOLLPRI | Epoll.EPOLLIN | Epoll.EPOLLERR)

      const childEnv = {}
      Object.assign(childEnv, process.env)
      childEnv.WAYLAND_DISPLAY = wlDislayName

      // when
      // TODO create a client
      const {stdout, stderr} = await execFile('/usr/bin/weston-terminal', [], {env: childEnv})
      console.log(stdout)
      console.error(stderr)

      // then
      assert(wlDisplay)
    })
  })
})
