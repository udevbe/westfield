import {
  Connection,
  MessageMarshallingContext,
  newObject,
  o,
  s,
  string,
  u,
  uint,
  WebFD,
  WlMessage,
  WlObject
} from 'westfield-runtime-common'

export class Proxy extends WlObject {
  readonly display: Display
  readonly _connection: Connection

  constructor(display: Display, connection: Connection, id: number) {
    super(id)
    this.display = display
    this._connection = connection
    connection.registerWlObject(this)
  }

  destroy() {
    super.destroy()
    this._connection.unregisterWlObject(this)
  }

  _marshallConstructor<T extends Proxy>(
    id: number,
    opcode: number,
    proxyClass: { new(display: Display, connection: Connection, id: number): T },
    argsArray: MessageMarshallingContext<any, any, any>[]
  ): T {
    // construct new object
    const proxy = new proxyClass(this.display, this._connection, this.display.generateNextId())

    // determine required wire message length
    let size = 4 + 2 + 2 // id+size+opcode
    argsArray.forEach(arg => {
      if (arg.type === 'n') {
        arg.value = proxy.id
      }
      size += arg.size
    })

    this._connection.marshallMsg(id, opcode, size, argsArray)

    return proxy
  }

  _marshall(id: number, opcode: number, argsArray: MessageMarshallingContext<any, any, any>[]) {
    // determine required wire message length
    let size = 4 + 2 + 2  // id+size+opcode
    argsArray.forEach(arg => size += arg.size)
    this._connection.marshallMsg(id, opcode, size, argsArray)
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
    return this._marshallConstructor(this.id, 0, WlCallbackProxy, [newObject()])
  }

  getRegistry(): WlRegistryProxy {
    return this._marshallConstructor(this.id, 1, WlRegistryProxy, [newObject()])
  }

  async [0](message: WlMessage) {
    await this.listener?.error(o(message, this._connection), u(message), s(message))
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

  bind<T extends Proxy>(name: number, interface_: string, proxyClass: { new(display: Display, connection: Connection, id: number): T }, version: number): T {
    return this._marshallConstructor(this.id, 0, proxyClass, [uint(name), string(interface_), uint(version), newObject()])
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
  private readonly _connection: Connection
  private _displayProxy: WlDisplayProxy
  private _lastId: number = 1
  // @ts-ignore
  private _destroyResolve: (value?: void | PromiseLike<void>) => void
  // @ts-ignore
  private _destroyReject: (reason?: any) => void
  private readonly _destroyPromise: Promise<void>

  constructor(connection: Connection) {
    this._connection = connection
    this._displayProxy = new WlDisplayProxy(this, this._connection, 1)
    this._destroyPromise = new Promise(((resolve, reject) => {
      this._destroyResolve = resolve
      this._destroyReject = reject
    }))

    this._displayProxy.listener = {
      deleteId: (id: number) => {
        this._recycledIds.push(id)
      },
      error: (proxy: Proxy, code: number, message: string) => {
        this._protocolError(proxy, code, message)
      }
    }
  }

  close() {
    if (this._connection.closed) {
      return
    }
    this._connection.close()
    this._destroyResolve()
  }

  _protocolError(proxy: Proxy, code: number, message: string) {
    if (this._connection.closed) {
      return
    }
    this._connection.close()
    this._destroyReject(new Error(`Protocol error. type: ${proxy.constructor.name}, id: ${proxy.id}, code: ${code}, message: ${message}`))
  }


  onClose(): Promise<void> {
    return this._destroyPromise
  }

  getRegistry(): WlRegistryProxy {
    return this._displayProxy.getRegistry()
  }

  generateNextId(): number {
    if (this._recycledIds.length) {
      return this._recycledIds.shift()!
    } else {
      return ++this._lastId
    }
  }


  sync(): Promise<number> {
    return new Promise<number>(resolve => {
      const wlCallbackProxy = this._displayProxy.sync()
      wlCallbackProxy.listener = {
        done: (data: number) => {
          resolve(data)
          wlCallbackProxy.destroy()
        }
      }
    })
  }

  flush() {
    this._connection.flush()
  }
}

// TODO This is currently a literal copy of the server implementation. Do all use cases match 1o1 and can we use a single common code base between client & server for WebFS?
export class WebFS {
  private readonly _fdDomainUUID: string
  private _webFDs: { [key: number]: WebFD } = {}
  private _nextFD: number = 0

  static create(fdDomainUUID: string): WebFS {
    return new WebFS(fdDomainUUID)
  }

  private constructor(fdDomainUUID: string) {
    this._fdDomainUUID = fdDomainUUID
  }

  fromArrayBuffer(arrayBuffer: ArrayBuffer): WebFD {
    const fd = this._nextFD++
    const type = 'ArrayBuffer'

    const webFdURL = new URL(`client://`)
    webFdURL.searchParams.append('fd', `${fd}`)
    webFdURL.searchParams.append('type', type)
    webFdURL.searchParams.append('clientId', this._fdDomainUUID)

    const webFD = new WebFD(fd, type, webFdURL, () => Promise.resolve(arrayBuffer), () => {
      delete this._webFDs[fd]
    })
    this._webFDs[fd] = webFD
    return webFD
  }

  fromImageBitmap(imageBitmap: ImageBitmap): WebFD {
    const fd = this._nextFD++
    const type = 'ImageBitmap'

    const webFdURL = new URL(`client://`)
    webFdURL.searchParams.append('fd', `${fd}`)
    webFdURL.searchParams.append('type', type)
    webFdURL.searchParams.append('clientId', this._fdDomainUUID)

    const webFD = new WebFD(fd, type, webFdURL, () => Promise.resolve(imageBitmap), () => {
      delete this._webFDs[fd]
    })
    this._webFDs[fd] = webFD
    return webFD
  }

  fromOffscreenCanvas(offscreenCanvas: OffscreenCanvas): WebFD {
    const fd = this._nextFD++
    const type = 'OffscreenCanvas'

    const webFdURL = new URL(`client://`)
    webFdURL.searchParams.append('fd', `${fd}`)
    webFdURL.searchParams.append('type', type)
    webFdURL.searchParams.append('clientId', this._fdDomainUUID)

    const webFD = new WebFD(fd, type, webFdURL, () => Promise.resolve(offscreenCanvas), () => {
      delete this._webFDs[fd]
    })
    this._webFDs[fd] = webFD
    return webFD
  }

  // TODO fromMessagePort

  getWebFD(fd: number): WebFD {
    return this._webFDs[fd]
  }
}
