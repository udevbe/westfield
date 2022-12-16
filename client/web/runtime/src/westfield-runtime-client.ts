import {
  Connection,
  FD,
  MessageMarshallingContext,
  newObject,
  o,
  s,
  string,
  u,
  uint,
  WlMessage,
  WlObject,
} from 'westfield-runtime-common'

export class Proxy extends WlObject {
  constructor(readonly display: Display, readonly connection: Connection, id: number) {
    super(id)
    connection.registerWlObject(this)
  }

  destroy() {
    super.destroy()
    this.connection.unregisterWlObject(this)
  }

  marshallConstructor<T extends Proxy>(
    id: number,
    opcode: number,
    proxyClass: { new (display: Display, connection: Connection, id: number): T },
    argsArray: MessageMarshallingContext<any, any, any>[],
  ): T {
    // construct new object
    const proxy = new proxyClass(this.display, this.connection, this.display.generateNextId())

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach((arg) => {
      if (arg.type === 'n') {
        arg.value = proxy.id
      }
      size += arg.size
    })

    this.connection.marshallMsg(id, opcode, size, argsArray)

    return proxy
  }

  marshall(id: number, opcode: number, argsArray: MessageMarshallingContext<any, any, any>[]) {
    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach((arg) => (size += arg.size))
    this.connection.marshallMsg(id, opcode, size, argsArray)
  }
}

// c/p to break circular dep.
interface WlDisplayEvents {
  error(objectId: Proxy, code: number, message: string): void

  deleteId(id: number): void
}

// c/p to break circular dep.
class WlDisplayProxy extends Proxy {
  listener?: WlDisplayEvents

  constructor(display: Display, connection: Connection, id: number) {
    super(display, connection, id)
  }

  sync(): WlCallbackProxy {
    return this.marshallConstructor(this.id, 0, WlCallbackProxy, [newObject()])
  }

  getRegistry(): WlRegistryProxy {
    return this.marshallConstructor(this.id, 1, WlRegistryProxy, [newObject()])
  }

  async [0](message: WlMessage) {
    await this.listener?.error(o(message, this.connection), u(message), s(message))
  }

  async [1](message: WlMessage) {
    await this.listener?.deleteId(u(message))
  }
}

// c/p to break circular dep.
class WlRegistryProxy extends Proxy {
  listener?: WlRegistryEvents

  constructor(display: Display, connection: Connection, id: number) {
    super(display, connection, id)
  }

  bind<T extends Proxy>(
    name: number,
    interface_: string,
    proxyClass: { new (display: Display, connection: Connection, id: number): T },
    version: number,
  ): T {
    return this.marshallConstructor(this.id, 0, proxyClass, [
      uint(name),
      string(interface_),
      uint(version),
      newObject(),
    ])
  }

  async [0](message: WlMessage) {
    await this.listener?.global(u(message), s(message), u(message))
  }

  async [1](message: WlMessage) {
    await this.listener?.globalRemove(u(message))
  }
}

// c/p to break circular dep.
interface WlRegistryEvents {
  global(name: number, interface_: string, version: number): void

  globalRemove(name: number): void
}

interface WlCallbackEvents {
  done(callbackData: number): void
}

// c/p to break circular dep.
class WlCallbackProxy extends Proxy {
  listener?: WlCallbackEvents

  constructor(display: Display, connection: Connection, id: number) {
    super(display, connection, id)
  }

  async [0](message: WlMessage) {
    await this.listener?.done(u(message))
  }
}

export interface Display {
  close(): void

  /**
   * Resolves once the connection is closed normally ie. with a call to close(). The promise will be rejected with an
   * error if the connection is closed abnormally ie when a protocol error is received.
   */
  onClose(): Promise<void>

  getRegistry(): WlRegistryProxy

  /**
   * Wait for the compositor to have send us all remaining events.
   *
   * The data in the resolved promise is the event serial.
   *
   * Don't 'await' this sync call as it will result in a deadlock where the worker will block all incoming events,
   * including the event the resolves the await state. Instead use the classic 'then(..)' construct.
   *
   */
  sync(): Promise<number>

  /**
   * Send queued messages to the compositor.
   */
  flush(): void

  /**
   * Set this to have a default 'catch-all' application error handler. Can be undefined for default behavior.
   */
  errorHandler?: (error: Error) => void

  /**
   * For internal use. Generates the id of the next proxy object.
   */
  generateNextId(): number
}

export class DisplayImpl implements Display {
  private _recycledIds: number[] = []
  private readonly connection: Connection
  private readonly displayProxy: WlDisplayProxy
  private lastId = 1
  // @ts-ignore
  private destroyResolve: (value?: void | PromiseLike<void>) => void
  // @ts-ignore
  private destroyReject: (reason?: any) => void
  private readonly destroyPromise: Promise<void>
  errorHandler?: (error: Error) => void

  constructor() {
    this.connection = new Connection()
    this.displayProxy = new WlDisplayProxy(this, this.connection, 1)
    this.destroyPromise = new Promise<void>((resolve, reject) => {
      this.destroyResolve = resolve
      this.destroyReject = reject
    })

    this.displayProxy.listener = {
      deleteId: (id: number) => {
        this._recycledIds.push(id)
      },
      error: (proxy: Proxy, code: number, message: string) => {
        this.protocolError(proxy, code, message)
      },
    }

    this.setupMessageHandling()
  }

  setupMessageHandling() {
    onmessage = (event: MessageEvent) => {
      if (this.connection.closed) {
        return
      }

      const webWorkerMessage = event.data as { protocolMessage: ArrayBuffer; meta: Transferable[] }
      const buffer = new Uint32Array(/** @type {ArrayBuffer} */ webWorkerMessage.protocolMessage)
      try {
        this.connection.message({ buffer, fds: webWorkerMessage.meta })
      } catch (e: any) {
        if (this.errorHandler && typeof this.errorHandler === 'function') {
          this.errorHandler(e)
        } else {
          console.error('\tname: ' + e.name + ' message: ' + e.message + ' text: ' + e.text)
          console.error('error object stack: ')
          console.error(e.stack)
        }
      }
    }

    this.connection.onFlush = function (wireMessages: { buffer: ArrayBuffer; fds: Array<FD> }[]): void {
      // convert to single arrayBuffer, so it can be sent over a data channel using zero copy semantics.
      const messagesSize = wireMessages.reduce(
        (previousValue, currentValue) => previousValue + currentValue.buffer.byteLength,
        0,
      )

      const sendBuffer = new Uint32Array(new ArrayBuffer(messagesSize))
      let offset = 0
      const meta: Transferable[] = []
      for (const wireMessage of wireMessages) {
        for (const fd of wireMessage.fds) {
          meta.push(fd as Transferable)
        }
        meta.concat(wireMessage.fds as Transferable[])
        const message = new Uint32Array(wireMessage.buffer)
        sendBuffer.set(message, offset)
        offset += message.length
      }

      self.postMessage({ protocolMessage: sendBuffer.buffer, meta }, [sendBuffer.buffer, ...meta])
    }
  }

  close() {
    if (this.connection.closed) {
      return
    }
    this.connection.close()
    this.destroyResolve()
  }

  protocolError(proxy: Proxy, code: number, message: string) {
    if (this.connection.closed) {
      return
    }
    this.connection.close()
    this.destroyReject(
      new Error(`Protocol error. type: ${proxy.constructor.name}, id: ${proxy.id}, code: ${code}, message: ${message}`),
    )
  }

  onClose(): Promise<void> {
    return this.destroyPromise
  }

  getRegistry(): WlRegistryProxy {
    return this.displayProxy.getRegistry()
  }

  generateNextId(): number {
    if (this._recycledIds.length) {
      return this._recycledIds.shift()!
    } else {
      return ++this.lastId
    }
  }

  sync(): Promise<number> {
    return new Promise<number>((resolve) => {
      const wlCallbackProxy = this.displayProxy.sync()
      wlCallbackProxy.listener = {
        done: (data: number) => {
          resolve(data)
          wlCallbackProxy.destroy()
        },
      }
    })
  }

  flush() {
    this.connection.flush()
  }
}
