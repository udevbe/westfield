const Display = require('../src/Display')
const {Endpoint} = require('westfield-endpoint')
const {Epoll} = require('epoll')
const childProcess = require('child_process')
const assert = require('assert')
const sinon = require('sinon')

describe('EndpointIntegration', () => {
  describe('endpoint display requests', () => {
    it('Should invoke the correct predefined display request implementations.', async () => {
      // given
      const display = new Display()
      let client = null
      /**
       * @param {Object}wlClient
       * @param {ArrayBuffer}messages
       * @param {ArrayBuffer}fdsIn
       * @returns {number}
       */
      const onWireMessage = (wlClient, messages, fdsIn) => {
        const fds = []
        if (fdsIn) {
          new Int32Array(fdsIn).forEach((fd) => {
            fds.push(fd)
          })
        }

        client.message({
          buffer: messages,
          fds: fds
        })
        return 1
      }

      const onClientDestroyed = sinon.fake()

      const onClientCreated = sinon.spy((wlClient) => {
        client = display.createClient()
        Endpoint.setWireMessageCallback(wlClient, onWireMessage)
        Endpoint.setClientDestroyedCallback(wlClient, onClientDestroyed)
      })

      const wlDisplay = Endpoint.createDisplay(onClientCreated)
      const wlDisplayName = Endpoint.addSocketAuto(wlDisplay)
      const wlDisplayFd = Endpoint.getFd(wlDisplay)

      const fdWatcher = new Epoll((err) => {
        assert(err == null)
        Endpoint.dispatchRequests(wlDisplay)
      })
      try {
        fdWatcher.add(wlDisplayFd, Epoll.EPOLLPRI | Epoll.EPOLLIN | Epoll.EPOLLERR)

        const childEnv = {}
        Object.assign(childEnv, process.env)
        childEnv.WAYLAND_DISPLAY = wlDisplayName
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