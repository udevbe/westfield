const childProcess = require('child_process')
const assert = require('assert')
const {Endpoint} = require('westfield-endpoint')

const CompositorSession = require('./CompositorSession')

describe('EndpointIntegration', () => {
  describe('endpoint display requests', () => {
    it('Should invoke the correct predefined display request implementations.', async () => {
      // given

      const compositorSession = CompositorSession.create()

      const childEnv = {}
      Object.assign(childEnv, process.env)
      childEnv.WAYLAND_DISPLAY = compositorSession.wlDisplayName
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

      assert(compositorSession.clients.length === 1)

      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })

      compositorSession.display.flushClients()

      //and when
      // a client is destroyed
      // child.kill()

      // then
      // destroy callback is called
      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })
      // assert(compositorSession.clients.length === 0)
    })
  })
})