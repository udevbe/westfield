const assert = require('assert')
const sinon = require('sinon')

const Client = require('../src/Client')
const Fixed = require('../src/Fixed')

/**
 * @returns {{}}
 */
function mockDisplay () {
  return {}
}

/**
 * @returns {{id: number, client: *, implementation: {firstRequest: implementation.firstRequest, secondRequest: implementation.secondRequest}, '0': 0, '1': 1}}
 */
function mockResource (client) {
  return {
    id: 123,
    client: client,
    implementation: {
      firstRequest: function (unsignedInt, fixed, newObjectId, array) {},
      secondRequest: function (int, object, string, fileDescriptor) {}
    },
    0: async function (message) {
      const args = this.client.unmarshallArgs(message, 'ufna')
      await this.implementation.firstRequest(...args)
    },
    1: async function (message) {
      const args = this.client.unmarshallArgs(message, 'iohs')
      await this.implementation.secondRequest(...args)
    }
  }
}

/**
 * @param targetResource
 * @param resourceArg
 * @returns {{buffer: ArrayBuffer, fds: Array<number>, bufferOffset: number, consumed: number, size: number}}
 */
function mockRawWireMessages (targetResource, resourceArg) {
  const buffer = new ArrayBuffer(
    4 + // object id - 0
    4 + // opcode + size - 1
    4 + // u - 2
    4 + // f - 3
    4 + // n - 4
    4 + 4 + 4 + // a - 5, 6, 7
    4 + // object id - 8
    4 + // opcode + size - 9
    4 + // i - 10
    4 + // o - 11
    4 + 4 // s - 12, 13
  )

  const uint8Buffer = new Uint8Array(buffer)
  const uint16Buffer = new Uint16Array(buffer)
  const uint32Buffer = new Uint32Array(buffer)
  const int32Buffer = new Int32Array(buffer)

  uint32Buffer[0] = targetResource.id // object id
  uint16Buffer[2] = 0 // opcode
  uint16Buffer[3] = 32 // size
  uint32Buffer[2] = 234 // u
  uint32Buffer[3] = Fixed.parse(123.45)._raw // f
  uint32Buffer[4] = 567 // n - 16
  uint32Buffer[5] = 8 // a byte size
  uint32Buffer[6] = 10 //a[0]
  uint32Buffer[7] = 11 //a[1]
  uint32Buffer[8] = targetResource.id
  uint16Buffer[18] = 1 // opcode
  uint16Buffer[19] = 28 // size (24 buffer + 4 fd)
  int32Buffer[10] = -987 // i
  uint32Buffer[11] = resourceArg.id // o
  uint32Buffer[12] = 4 // s byte size
  uint8Buffer[52] = 'a'.charCodeAt(0)
  uint8Buffer[53] = 'b'.charCodeAt(0)
  uint8Buffer[54] = 'c'.charCodeAt(0)
  uint8Buffer[55] = 'd'.charCodeAt(0)

  const fd = 321
  return {
    buffer: buffer,
    fds: [fd],
    bufferOffset: 0,
    consumed: 0,
    size: 0
  }
}

describe('Client', () => {
  describe('message', () => {
    it('Should invoke the correct resource with the correct arguments.', async () => {
      //given
      // - a mock display
      // - a resource with a two requests with all possible arguments
      // - 1 block of 2 raw wire messages
      const display = mockDisplay()
      const client = new Client(display)
      const resource = mockResource(client)

      resource.implementation.firstRequest = sinon.fake()
      resource.implementation.secondRequest = sinon.fake()

      resourceArgument = {id: 666}

      client.registerResource(resource)
      client.registerResource(resourceArgument)

      const incomingWireMessage = mockRawWireMessages(resource, resourceArgument)

      //when
      // - incoming wire messages are received
      await client.message(incomingWireMessage)

      //then
      // - both request functions are invoked with the correct arguments
      assert(resource.implementation.firstRequest.calledWith(234, sinon.match({'_raw': (123.45 * 256.0) >> 0}), 567, sinon.match.any))
      assert(resource.implementation.secondRequest.calledWith(-987, resourceArgument, 321, 'abcd'))
    })

    it('Should invoke the resource with the async requests in the right order.', async function () {
      //given
      // - a mock display
      // - a resource with a two subsequently called requests, of which the first one is async
      // - 2 blocks of 2 raw wire messages
      const display = mockDisplay()
      const client = new Client(display)
      const resource = mockResource(client)

      resource.implementation.firstRequest = sinon.fake()
      let resolveSecondRequest
      resource.implementation.secondRequest = async () => {
        return new Promise((resolve) => {
          resolveSecondRequest = resolve
        })
      }

      resourceArgument = {id: 666}

      client.registerResource(resource)
      client.registerResource(resourceArgument)

      const firstIncomingWireMessage = mockRawWireMessages(resource, resourceArgument)
      const secondIncomingWireMessage = mockRawWireMessages(resource, resourceArgument)

      //when
      // - first and second incoming wire messages are received
      client.message(firstIncomingWireMessage)
      client.message(secondIncomingWireMessage)

      //then
      // - then only first request is called
      assert(resource.implementation.firstRequest.calledOnce)
      // - and when second request of first block of wires messages is resolved
      await new Promise((resolve => {
        setTimeout(() => {
          resolveSecondRequest()
          resolve()
        }, 0)
      }))
      await new Promise((resolve => {
        setTimeout(() => {
          resolve()
        }, 0)
      }))
      // - then second block of wire messages will be handled
      assert(resource.implementation.firstRequest.calledTwice)
    })
  })
})