const assert = require('assert')
const sinon = require('sinon')

const childProcess = require('child_process')

const {Epoll} = require('epoll')

const Endpoint = require('../src/Endpoint')

describe('CompositorEndpoint', () => {
  describe('display lifecycle', () => {
    it('should be able to start and stop a compositor endpoint using the underlying wl_display struct', () => {
      // given
      const onClientCreated = sinon.fake()
      const onGlobalCreated = sinon.fake()
      const onGlobalDestroyed = sinon.fake()

      // when
      const wlDisplay = Endpoint.createDisplay(onClientCreated, onGlobalCreated, onGlobalDestroyed)
      Endpoint.destroyDisplay(wlDisplay)

      // then
      assert(wlDisplay)
    })
  })

  describe('client lifecycle', () => {
    it('should be able to handle incoming client connections', async () => {
      // given

      const onClientDestroyed = sinon.fake()
      const onGlobalCreated = sinon.fake()
      const onGlobalDestroyed = sinon.fake()

      const onClientCreated = sinon.spy((wlClient) => {
        Endpoint.setClientDestroyedCallback(wlClient, onClientDestroyed)
      })

      const wlDisplay = Endpoint.createDisplay(onClientCreated, onGlobalCreated, onGlobalDestroyed)
      const wlDislayName = Endpoint.addSocketAuto(wlDisplay)
      const wlDisplayFd = Endpoint.getFd(wlDisplay)

      const fdWatcher = new Epoll((err) => {
        assert(err == null)
        Endpoint.dispatchRequests(wlDisplay)
      })
      try {
        fdWatcher.add(wlDisplayFd, Epoll.EPOLLPRI | Epoll.EPOLLIN | Epoll.EPOLLERR)

        const childEnv = {}
        Object.assign(childEnv, process.env)
        childEnv.WAYLAND_DISPLAY = wlDislayName
        childEnv.WAYLAND_DEBUG = 'client'

        // when
        // a client is connecting
        // TODO ideally a separate test client with feedback would be nice
        const child = childProcess.execFile('/usr/bin/weston-terminal', [], {env: childEnv}, (stdout, stderr) => {
          console.log(stdout)
          console.error(stderr)
        })

        // then
        // client creation callback is called
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })

        assert(wlDisplay)
        assert(onClientCreated.calledOnce)

        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })

        // assert(onWireMessage.called)

        //and when
        // a client is destroyed
        child.kill()

        // then
        // destroy callback is called
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        assert(onClientDestroyed.called)
      }
      finally {
        fdWatcher.remove(wlDisplayFd)
      }
    })
  })
})
