/*
MIT License

Copyright (c) 2017 Erik De Rijcke

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
const upperCamelCase = require('uppercamelcase')

const ProtocolArguments = require('./ProtocolArguments')

class ProtocolParser {
  static _generateEventArgs (out, req) {
    if (req.hasOwnProperty('arg')) {
      const evArgs = req.arg
      let processedFirstArg = false
      for (let i = 0; i < evArgs.length; i++) {
        const arg = evArgs[i]
        if (arg.$.type === 'new_id') {
          continue
        }

        const argName = camelCase(arg.$.name)
        if (processedFirstArg) {
          out.write(', ')
        }
        out.write(argName)
        processedFirstArg = true
      }
    }
  }

  static _generateRequestArgs (out, ev) {
    out.write('resource')
    if (ev.hasOwnProperty('arg')) {
      const evArgs = ev.arg
      for (let i = 0; i < evArgs.length; i++) {
        const arg = evArgs[i]
        const argName = camelCase(arg.$.name)
        out.write(', ' + argName)
      }
    }
  }

  static _parseRequestSignature (ev) {
    let evSig = ''
    if (ev.hasOwnProperty('arg')) {
      const evArgs = ev.arg
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

  static _generateIfRequestGlue (out, ev, opcode) {
    const evName = camelCase(ev.$.name)

    out.write(`\tasync [${opcode}] (message) {\n`)
    const evSig = ProtocolParser._parseRequestSignature(ev)
    if (evSig.length) {
      out.write(`\t\tconst args = this.client.unmarshallArgs(message,'${evSig}')\n`)
      out.write(`\t\tawait this.implementation.${evName}(this, ...args)\n`)
    } else {
      out.write(`\t\tawait this.implementation.${evName}(this)\n`)
    }
    out.write('\t}\n')
  }

  _parseItfRequest (requestsOut, resourceName, itfRequest) {
    const sinceVersion = itfRequest.$.hasOwnProperty('since') ? parseInt(itfRequest.$.since) : 1
    const reqName = camelCase(itfRequest.$.name)

    // function docs
    if (itfRequest.hasOwnProperty('description')) {
      const description = itfRequest.description
      description.forEach((val) => {
        requestsOut.write('\n\t/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            requestsOut.write('\t *' + line + '\n')
          })
        }

        requestsOut.write('\t *\n')
        requestsOut.write(`\t * @param {${resourceName}} resource \n`)
        if (itfRequest.hasOwnProperty('arg')) {
          const evArgs = itfRequest.arg
          evArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argName = camelCase(arg.$.name)
            const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')
            const argType = arg.$.type

            requestsOut.write(`\t * @param {${ProtocolArguments[argType](argName, optional).jsType}} ${argName} ${argDescription} \n`)
          })
        }
        requestsOut.write('\t *\n')
        requestsOut.write(`\t * @since ${sinceVersion}\n`)
        requestsOut.write('\t *\n')
        requestsOut.write('\t */\n')
      })
    }

    // function
    requestsOut.write(`\t${reqName}(`)
    ProtocolParser._generateRequestArgs(requestsOut, itfRequest)
    requestsOut.write(') {}\n')
  }

  _parseItfEvent (out, itfEvent, opcode) {
    const sinceVersion = itfEvent.$.hasOwnProperty('since') ? parseInt(itfEvent.$.since) : 1

    const reqName = camelCase(itfEvent.$.name)

    // function docs
    if (itfEvent.hasOwnProperty('description')) {
      const description = itfEvent.description
      description.forEach((val) => {
        out.write('\n\t/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            out.write('\t *' + line + '\n')
          })
        }

        if (itfEvent.hasOwnProperty('arg')) {
          const reqArgs = itfEvent.arg
          out.write('\t *\n')
          reqArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argName = camelCase(arg.$.name)
            const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')
            const argType = arg.$.type
            if (argType !== 'new_id') {
              out.write(`\t * @param {${ProtocolArguments[argType](argName, optional).jsType}} ${argName} ${argDescription} \n`)
            }
          })

          reqArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argItf = arg.$['interface']
            const argType = arg.$.type
            if (argType === 'new_id') {
              out.write(`\t * @return {number} resource id. ${argDescription} \n`)
            }
          })
          out.write('\t *\n')
        }
        out.write(`\t * @since ${sinceVersion}\n`)
        out.write('\t *\n')
        out.write('\t */\n')
      })
    }

    // function
    out.write(`\t${reqName} (`)
    ProtocolParser._generateEventArgs(out, itfEvent)
    out.write(') {\n')

    let itfName
    // function args
    let argArray = '['
    if (itfEvent.hasOwnProperty('arg')) {
      const reqArgs = itfEvent.arg

      for (let i = 0; i < reqArgs.length; i++) {
        const arg = reqArgs[i]
        const argType = arg.$.type
        const argName = camelCase(arg.$.name)
        const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')

        if (argType === 'new_id') {
          itfName = upperCamelCase(arg.$['interface'])
        }

        if (i !== 0) {
          argArray += ', '
        }

        argArray += ProtocolArguments[argType](argName, optional).marshallGen
      }
    }
    argArray += ']'

    if (itfName) {
      out.write(`\t\treturn this.client.marshallConstructor(this.id, ${opcode}, '${itfName}', ${argArray})\n`)
    } else {
      out.write(`\t\tthis.client.marshall(this.id, ${opcode}, ${argArray})\n`)
    }

    out.write('\t}\n')
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _writeResource (jsonProtocol, outDir, protocolItf) {
    const itfNameOrig = protocolItf.$.name
    const itfName = upperCamelCase(itfNameOrig)
    let itfVersion = 1

    if (protocolItf.$.hasOwnProperty('version')) {
      itfVersion = parseInt(protocolItf.$.version)
    }

    console.log(`Processing interface ${itfName} v${itfVersion}`)

    const resourceName = `${itfName}Resource`
    const resourceOut = fs.createWriteStream(path.join(outDir, `${resourceName}.js`))

    resourceOut.write('/*\n')
    jsonProtocol.protocol.copyright.forEach((val) => {
      val.split('\n').forEach((line) => {
        resourceOut.write(' *' + line + '\n')
      })
    })
    resourceOut.write(' */\n\n')

    resourceOut.write('const {Resource, WireFormat} = require(\'westfield-runtime-server\').private\n')
    resourceOut.write('const {parseFixed, uint, uintOptional, int, intOptional, fixed, \n' +
      '\tfixedOptional, object, objectOptional, newObject, string, \n' +
      '\tstringOptional, array, arrayOptional} = WireFormat\n')

    // class docs
    const description = protocolItf.description
    if (description) {
      description.forEach((val) => {
        resourceOut.write('\n/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            resourceOut.write(' *' + line + '\n')
          })
        }
        resourceOut.write(' */\n')
      })
    }

    // class
    resourceOut.write(`class ${resourceName} extends Resource {\n`)

    // events
    if (protocolItf.hasOwnProperty('event')) {
      const itfEvents = protocolItf.event
      for (let j = 0; j < itfEvents.length; j++) {
        this._parseItfEvent(resourceOut, itfEvents[j], j)
      }
    }

    const requestsName = `${itfName}Requests`

    // requests
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      this._writeRequests(jsonProtocol, outDir, itfRequests, resourceName, requestsName)
    }

    // constructor
    resourceOut.write('\n/**\n')
    resourceOut.write('\t *@param {Client}client\n')
    resourceOut.write('\t *@param {number}id\n')
    resourceOut.write('\t *@param {number}version\n')
    resourceOut.write('\t */\n')
    resourceOut.write('\tconstructor (client, id, version) {\n')
    resourceOut.write('\t\tsuper(client, id, version)\n')
    resourceOut.write('\t\t/**\n')
    resourceOut.write(`\t\t * @type {${requestsName}|null}\n`)
    resourceOut.write('\t\t */\n')
    resourceOut.write('\t\tthis.implementation = null\n')
    resourceOut.write('\t}\n\n')

    // glue request functions
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      for (let j = 0; j < itfRequests.length; j++) {
        const itfRequest = itfRequests[j]
        let since = '1'
        if (itfRequest.$.hasOwnProperty('since')) {
          since = itfRequest.$.since
        }

        ProtocolParser._generateIfRequestGlue(resourceOut, itfRequest, j)
      }
    }

    resourceOut.write('}\n')
    resourceOut.write(`${resourceName}.protocolName = '${itfNameOrig}'\n\n`)

    // enums
    if (protocolItf.hasOwnProperty('enum')) {
      // create new files to define enums
      const itfEnums = protocolItf.enum
      for (let j = 0; j < itfEnums.length; j++) {
        const itfEnum = itfEnums[j]
        const enumName = upperCamelCase(itfEnum.$.name)

        resourceOut.write(`${resourceName}.${enumName} = {\n`)

        let firstArg = true
        itfEnum.entry.forEach((entry) => {
          const entryName = camelCase(entry.$.name)
          const entryValue = entry.$.value
          const entrySummary = entry.$.summary || ''

          if (!firstArg) {
            resourceOut.write(',\n')
          }
          firstArg = false

          resourceOut.write('  /**\n')
          resourceOut.write(`   * ${entrySummary}\n`)
          resourceOut.write('   */\n')
          resourceOut.write(`  ${entryName}: ${entryValue}`)
        })
        resourceOut.write('\n}\n\n')
      }
    }

    resourceOut.write(`module.exports = ${resourceName}\n`)
    resourceOut.end()
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _parseInterface (jsonProtocol, outDir, protocolItf) {
    this._writeResource(jsonProtocol, outDir, protocolItf)
  }

  // TODO make outFile -> outDir
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

  _writeRequests (jsonProtocol, outDir, itfRequests, resourceName, requestsName) {
    const requestsFile = path.join(outDir, `${requestsName}.js`)
    const requestsOut = fs.createWriteStream(requestsFile)

    requestsOut.write('/*\n')
    jsonProtocol.protocol.copyright.forEach((val) => {
      val.split('\n').forEach((line) => {
        requestsOut.write(' *' + line + '\n')
      })
    })
    requestsOut.write(' */\n\n')

    requestsOut.write('/**\n')
    requestsOut.write(' * @interface\n')
    requestsOut.write(' */\n')
    requestsOut.write(`class ${requestsName} {\n`)

    for (let j = 0; j < itfRequests.length; j++) {
      const itfRequest = itfRequests[j]
      this._parseItfRequest(requestsOut, resourceName, itfRequest)
    }

    requestsOut.write('}\n\n')
    requestsOut.write(`module.exports = ${requestsName}\n`)
    requestsOut.end()
  }
}

module.exports = ProtocolParser