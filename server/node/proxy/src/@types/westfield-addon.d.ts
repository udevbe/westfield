declare namespace westfieldAddon {
  function createDisplay(
    onClientCreated: (wlClient: unknown) => void,
    onGlobalCreated: (globalName: number) => void,
    onGlobalDestroyed: (globalName: number) => void,
  ): unknown

  function setClientDestroyedCallback(wlClient: unknown, onClientDestroyed: (wlClient: unknown) => void): void

  function setWireMessageCallback(
    wlClient: unknown,
    onWireMessage: (wlClient: unknown, wiresMessages: ArrayBuffer, objectId: number, opcode: number) => number,
  ): void

  function setWireMessageEndCallback(
    wlClient: unknown,
    onWireMessageEnd: (wlClient: unknown, fdsIn: ArrayBuffer) => void,
  ): void

  function destroyDisplay(wlDisplay: unknown): void

  function addSocketAuto(wlDisplay: unknown): string

  function destroyClient(wlClient: unknown): void

  function sendEvents(wlClient: unknown, wireMessages: Uint32Array, fdsOut: Uint32Array): void

  function dispatchRequests(wlDisplay: unknown): void

  function flush(wlClient: unknown): void

  function getFd(wlDisplay: unknown): number

  function initShm(wlDisplay: unknown): void

  /**
   * Returns initialized EGL context
   * @param wlDisplay
   */
  function initDrm(wlDisplay: unknown): unknown

  function setRegistryCreatedCallback(
    wlClient: unknown,
    onRegistryCreated: (wlRegistry: unknown, registryId: number) => void,
  ): void

  function emitGlobals(wlRegistry: unknown): void

  function createWlMessage(name: string, signature: string, wlInterfaces: unknown[]): unknown

  function initWlInterface(
    wlInterface: unknown,
    name: string,
    version: number,
    wlMessageRequests: unknown[],
    wlMessageEvents: unknown[],
  ): void

  function createWlInterface(): unknown

  function createWlResource(wlClient: unknown, id: number, version: number, wlInterface: unknown): unknown

  function destroyWlResourceSilently(wlClient: unknown, wlResourceId: number): void

  function setupXWayland(
    wlDisplay: unknown,
    onXWaylandStarting: (wmFd: number, wlClient: unknown) => void,
    onXWaylandDestroyed: () => void,
  ): unknown

  function teardownXWayland(westfieldXWayland: unknown): void

  function setBufferCreatedCallback(wlClient: unknown, onBufferCreated: (bufferId: number) => void): void

  function createMemoryMappedFile(contents: Buffer): number

  function getServerObjectIdsBatch(wlClient: unknown, ids: Uint32Array): void

  function makePipe(resultBuffer: Uint32Array): void

  function equalValueExternal(objectA: unknown, objectB: unknown): boolean

  function getXWaylandDisplay(xWayland: unknown): number
}

export = westfieldAddon
