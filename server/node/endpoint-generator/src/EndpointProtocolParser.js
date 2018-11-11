/*
MIT License

Copyright (c) 2018 Erik De Rijcke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

const path = require('path')
const fs = require('fs')
const xml2js = require('xml2js')

const camelCase = require('camelcase')
const ProtocolArguments = require('./EndpointProtocolArguments')

class EndpointProtocolParser {
  static _parseMessageInterfaces (itfMessage) {
    let argInterfaces = '['
    if (itfMessage.hasOwnProperty('arg')) {
      const evArgs = itfMessage.arg
      for (let i = 0; i < evArgs.length; i++) {
        const arg = evArgs[i]
        const argType = arg.$.type
        let interface_ = 'null'
        if (argType === 'object' || argType === 'new_id') {
          const argInterface = arg.$.interface
          if (argInterface != null) {
            interface_ = `require('./${argInterface}_interface')`
          }
        }

        if (i !== 0) {
          argInterfaces += ', '
        }
        argInterfaces += interface_
      }
    }
    argInterfaces += ']'

    return argInterfaces
  }

  static _parseMessageSignature (itfMessage) {
    let evSig = ''
    if (itfMessage.hasOwnProperty('arg')) {
      const evArgs = itfMessage.arg
      for (let i = 0; i < evArgs.length; i++) {
        const arg = evArgs[i]

        const argName = camelCase(arg.$.name)
        const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')
        const argType = arg.$.type

        evSig += ProtocolArguments[argType](argName, optional).signature
      }
    }

    return evSig
  }

  static _generateIfRequestGlue (out, itfRequest, opcode, protocolItf) {
    let evSig
    if (protocolItf.$.name === 'wl_registry' && itfRequest.$.name === 'bind') {
      evSig = 'usun'
    } else {
      evSig = EndpointProtocolParser._parseMessageSignature(itfRequest)
    }
    const evName = camelCase(itfRequest.$.name)
    if (evSig.includes('n')) {
      out.write(`\t[${opcode}] (message) {\n`)
      out.write(`\t\tconst args = WireMessageUtil.unmarshallArgs(message,'${evSig}')\n`)
      out.write(`\t\treturn this.handlers.${evName}(...args)\n`)
      out.write('\t}\n')
    }
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _writeInterface (jsonProtocol, outDir, protocolItf) {
    const itfName = protocolItf.$.name
    let itfVersion = 1
    if (protocolItf.$.hasOwnProperty('version')) {
      itfVersion = protocolItf.$.version
    }

    const resourceName = `${itfName}_interface`
    const interfaceOut = fs.createWriteStream(path.join(outDir, `${resourceName}.js`))

    interfaceOut.write(`const { Endpoint } = require('westfield-endpoint')\n\n`)
    interfaceOut.write(`const requests = [\n`)
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      for (let i = 0; i < itfRequests.length; i++) {
        const itfRequest = itfRequests[i]
        const messageName = itfRequest.$.name
        const signature = EndpointProtocolParser._parseMessageSignature(itfRequest)
        if (i !== 0) {
          interfaceOut.write(', \n')
        }
        interfaceOut.write(`\tEndpoint.createWlMessage('${messageName}', '${signature}', ${EndpointProtocolParser._parseMessageInterfaces(itfRequest)})`)
      }
    }
    interfaceOut.write(`\n]\n\n`)

    interfaceOut.write(`const events = [\n`)
    if (protocolItf.hasOwnProperty('event')) {
      const itfEvents = protocolItf.event
      for (let i = 0; i < itfEvents.length; i++) {
        const itfEvent = itfEvents[i]
        const messageName = itfEvent.$.name
        const signature = EndpointProtocolParser._parseMessageSignature(itfEvent)
        if (i !== 0) {
          interfaceOut.write(', \n')
        }
        interfaceOut.write(`\tEndpoint.createWlMessage('${messageName}', '${signature}', ${EndpointProtocolParser._parseMessageInterfaces(itfEvent)})`)
      }
    }
    interfaceOut.write(`\n]\n\n`)

    interfaceOut.write(`module.export = Endpoint.createWlInterface('${itfName}', ${itfVersion}, requests, events)`)
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _writeInterceptor (jsonProtocol, outDir, protocolItf) {
    const itfName = protocolItf.$.name

    const resourceName = `${itfName}_interceptor`
    const interceptorOut = fs.createWriteStream(path.join(outDir, `${resourceName}.js`))

    interceptorOut.write(`const { WireMessageUtil, Endpoint } = require('westfield-endpoint')\n\n`)

    // class
    interceptorOut.write(`class ${resourceName} {\n`)

    // constructor
    interceptorOut.write('\tconstructor (wlClient, interceptors, version, remoteResource) {\n')
    interceptorOut.write('\t\tthis.wlResource = remoteResource\n')
    interceptorOut.write('\t\tthis.handlers = {\n')
    const constructorRequests = this._getConstructorRequest(protocolItf)
    if (constructorRequests.length) {
      this._generateFactoryInterceptionHandlers(interceptorOut, constructorRequests, protocolItf)
    }

    // TODO native endpoint lib must expose function to destroy resource without emitting id destroyed event

    interceptorOut.write('\t\t}\n')
    interceptorOut.write('\t}\n\n')

    // glue request functions
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      for (let j = 0; j < itfRequests.length; j++) {
        const itfRequest = itfRequests[j]
        EndpointProtocolParser._generateIfRequestGlue(interceptorOut, itfRequest, j, protocolItf)
      }
    }

    interceptorOut.write('}\n')

    interceptorOut.write(`module.exports = ${resourceName}\n`)
    interceptorOut.end()
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _parseInterface (jsonProtocol, outDir, protocolItf) {
    let itfVersion = 1
    if (protocolItf.$.hasOwnProperty('version')) {
      itfVersion = parseInt(protocolItf.$.version)
    }
    console.log(`Processing interface ${protocolItf.$.name} v${itfVersion}`)

    this._writeInterface(jsonProtocol, outDir, protocolItf)
    this._writeInterceptor(jsonProtocol, outDir, protocolItf)
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @private
   */
  _parseProtocol (jsonProtocol, outDir) {
    jsonProtocol.protocol.interface.forEach((itf) => {
      this._parseInterface(jsonProtocol, outDir, itf)
    })
    console.log('Done')
  }

  // TODO make outFile -> outDir
  /**
   * @param {string}outDir
   */
  parse (outDir) {
    let appRoot
    if (this.protocolFile.substring(0, 1) === '/') {
      appRoot = ''
    } else {
      appRoot = process.env.PWD
    }

    if (!outDir) {
      outDir = process.env.PWD
    }

    fs.readFile(path.join(appRoot, this.protocolFile), (err, data) => {
      if (err) throw err
      new xml2js.Parser().parseString(data, (err, result) => {
        if (err) throw err

        // uncomment to see the protocol as json output
        // console.log(util.inspect(result, false, null));

        this._parseProtocol(result, outDir)
      })
    })
  }

  constructor (protocolFile) {
    this.protocolFile = protocolFile
  }

  _getConstructorRequest (protocolItf) {
    const constructorRequests = []
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      for (let j = 0; j < itfRequests.length; j++) {
        const itfRequest = itfRequests[j]
        if (itfRequest.hasOwnProperty('arg')) {
          const reqArg = itfRequest.arg
          for (let i = 0; i < reqArg.length; i++) {
            const arg = reqArg[i]
            if (arg.$.type === 'new_id') {
              constructorRequests.push(itfRequest)
            }
          }
        }
      }
    }

    return constructorRequests
  }

  _generateFactoryInterceptionHandlers (resourceOut, constructorRequests, protocolItf) {
    constructorRequests.forEach(itfRequest => {
      let resourceName = null

      const reqName = itfRequest.$.name
      resourceOut.write(`\t\t\t${camelCase(reqName)}: (`)

      if (reqName === 'bind' && protocolItf.$.name === 'wl_registry') {
        // special case registry bind, xml signature is 'un', generated signature should be 'usun'.
        resourceOut.write(`name, interface_, version, id`)
        resourceName = '${interface_}'
      } else {
        const evArgs = itfRequest.arg
        for (let i = 0; i < evArgs.length; i++) {
          const reqArg = evArgs[i]
          if (i !== 0) {
            resourceOut.write(', ')
          }
          resourceOut.write(`${reqArg.$.name}`)
          if (reqArg.$.type === 'new_id') {
            resourceName = reqArg.$.interface
          }
        }
      }

      resourceOut.write(`) => {\n`)
      if (reqName === 'bind' && protocolItf.$.name === 'wl_registry') {
        resourceOut.write(`\t\t\t\tif (require('westfield-endpoint').nativeGlobalNames.contains(interface_)) {\n`)
        resourceOut.write(`\t\t\t\t\treturn false\n`)
        resourceOut.write(`\t\t\t\t} else {\n`)
        resourceOut.write(`\t\t\t\t\tconst remoteResource = Endpoint.createWlResource(wlClient, id, version, require(\`./${resourceName}_interface\`))\n`)
        resourceOut.write(`\t\t\t\t\tinterceptors[id] =  new require(\`./${resourceName}_interceptor\`)(wlClient, interceptors, version, remoteResource)\n`)
        resourceOut.write(`\t\t\t\t\treturn true\n`)
        resourceOut.write(`\t\t\t\t}\n`)
      } else {
        resourceOut.write(`\t\t\t\t\tconst remoteResource = Endpoint.createWlResource(wlClient, id, version, require(\`./${resourceName}_interface\`))\n`)
        resourceOut.write(`\t\t\t\t\tinterceptors[id] =  new require(\`./${resourceName}_interceptor\`)(wlClient, interceptors, version, remoteResource)\n`)
        resourceOut.write(`\t\t\t\t\treturn true\n`)
      }
      resourceOut.write(`\t\t\t},\n`)
    })
  }
}

module.exports = EndpointProtocolParser