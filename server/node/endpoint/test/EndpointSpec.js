const assert = require('assert')
const sinon = require('sinon')

const childProcess = require('child_process')

const {Epoll} = require('epoll')

const EndPoint = require('../src/Endpoint')

describe('CompositorEndpoint', () => {
  describe('display lifecycle', () => {
    it('should be able to start and stop a compositor endpoint using the underlying wl_display struct', () => {
      // given
      const onClientCreated = sinon.fake()
      const onClientDestroyed = sinon.fake()
      const onWireMessage = sinon.fake()
      const compositorEndpoint = EndPoint.create()

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
      const onClientCreated = sinon.fake()
      const onClientDestroyed = sinon.fake()
      const onWireMessage = (wlClient, messages, fdsIn) => {
        const uint32Messages = new Uint32Array(messages)
        const objectId = uint32Messages[0]
        const size = uint32Messages[1] >>> 16
        const opcode = uint32Messages[1] & 0x0000FFFF

        console.log(objectId, size, opcode)
      }
      const endpoint = EndPoint.create()
      const wlDisplay = endpoint.createDisplay(onClientCreated, onClientDestroyed, onWireMessage)
      const wlDislayName = endpoint.addSocketAuto(wlDisplay)
      const wlDisplayFd = endpoint.getFd(wlDisplay)

      const fdWatcher = new Epoll((err) => {
        assert(err == null)
        endpoint.dispatchRequests(wlDisplay)
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
