import { WebFD } from 'westfield-runtime-common'

// TODO This is currently a literal copy of the server implementation. Do all use cases match 1o1 and can we use a single common code base between client & server for WebFS?
export default class WebFS {
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
