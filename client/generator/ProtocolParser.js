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
  static _generateRequestArgs (codeLines, req) {
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
          codeLines.push(', ')
        }
        codeLines.push(argName)
        processedFirstArg = true
      }
    }
  }

  static _generateEventArgs (out, ev) {
    if (ev.hasOwnProperty('arg')) {
      const evArgs = ev.arg

      const arg0 = evArgs[0]
      const arg0Name = camelCase(arg0.$.name)
      out.write(arg0Name)

      for (let i = 1; i < evArgs.length; i++) {
        const arg = evArgs[i]
        const argName = camelCase(arg.$.name)
        out.write(', ' + argName)
      }
    }
  }

  static _parseEventSignature (ev) {
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

  static _generateIfEventGlue (importLines, codeLines, ev, opcode) {
    const evName = camelCase(ev.$.name)

    codeLines.push(`\t[${opcode}] (message) {\n`)
    if (ev.hasOwnProperty('arg')) {
      const evSig = this._parseEventSignature(ev)
      codeLines.push(`\t\tconst args = this.display.unmarshallArgs(message, '${evSig}')\n`)
    }

    codeLines.push(`\t\tthis.listener.${evName}(`)

    if (ev.hasOwnProperty('arg')) {
      const evArgs = ev.arg
      const arg0 = evArgs[0]
      const arg0Type = arg0.$.type
      codeLines.push(`args[0]`)
      if (arg0Type === 'new_id') {
        const argItf = upperCamelCase(arg0.$['interface']) + 'Proxy'
        importLines.push(`const ${argItf} = require('./${argItf}')\n`)
        codeLines.push(`(${argItf}.constructor)`)
      }
      for (let i = 1; i < evArgs.length; i++) {
        codeLines.push(', ')
        const arg = evArgs[i]
        const argType = arg.$.type
        codeLines.push(`args[${i}]`)
        if (argType === 'new_id') {
          const argItf = upperCamelCase(arg.$['interface']) + 'Proxy'
          importLines.push(`const ${argItf} = require('./${argItf}')\n`)
          codeLines.push(`(${argItf}.constructor)`)
        }
      }
    }

    codeLines.push(')\n')
    codeLines.push('\t}\n\n')
  }

  _parseItfEvent (eventsOut, itfEvent) {
    const sinceVersion = itfEvent.$.hasOwnProperty('since') ? parseInt(itfEvent.$.since) : 1
    const reqName = camelCase(itfEvent.$.name)

    // function docs
    if (itfEvent.hasOwnProperty('description')) {
      const description = itfEvent.description
      description.forEach((val) => {
        eventsOut.write('\n\t/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            eventsOut.write('\t *' + line + '\n')
          })
        }

        eventsOut.write('\t *\n')
        if (itfEvent.hasOwnProperty('arg')) {
          const evArgs = itfEvent.arg
          evArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argName = camelCase(arg.$.name)
            const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')
            const argType = arg.$.type

            eventsOut.write(`\t * @param {${ProtocolArguments[argType](argName, optional).jsType}} ${argName} ${argDescription} \n`)
          })
        }
        eventsOut.write('\t *\n')
        eventsOut.write(`\t * @since ${sinceVersion}\n`)
        eventsOut.write('\t *\n')
        eventsOut.write('\t */\n')
      })
    }

    // function
    eventsOut.write(`\t${reqName}(`)
    ProtocolParser._generateEventArgs(eventsOut, itfEvent)
    eventsOut.write(') {}\n')
  }

  _parseItfRequest (codeLines, importLines, itfRequest, opcode) {
    const sinceVersion = itfRequest.$.hasOwnProperty('since') ? parseInt(itfRequest.$.since) : 1

    const reqName = camelCase(itfRequest.$.name)

    // function docs
    if (itfRequest.hasOwnProperty('description')) {
      const description = itfRequest.description
      description.forEach((val) => {
        codeLines.push('\n\t/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            codeLines.push('\t *' + line + '\n')
          })
        }

        if (itfRequest.hasOwnProperty('arg')) {
          const reqArgs = itfRequest.arg
          codeLines.push('\t *\n')
          reqArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argName = camelCase(arg.$.name)
            const optional = arg.$.hasOwnProperty('allow-null') && (arg.$['allow-null'] === 'true')
            const argType = arg.$.type
            if (argType !== 'new_id') {
              codeLines.push(`\t * @param {${ProtocolArguments[argType](argName, optional).jsType}} ${argName} ${argDescription} \n`)
            }
          })

          reqArgs.forEach((arg) => {
            const argDescription = arg.$.summary || ''
            const argItf = arg.$['interface']
            const argType = arg.$.type
            if (argType === 'new_id') {
              codeLines.push(`\t * @return {${argItf}} ${argDescription} \n`)
            }
          })
          codeLines.push('\t *\n')
        }
        codeLines.push(`\t * @since ${sinceVersion}\n`)
        codeLines.push('\t *\n')
        codeLines.push('\t */\n')
      })
    }

    // function
    codeLines.push(`\t${reqName} (`)
    ProtocolParser._generateRequestArgs(codeLines, itfRequest)
    codeLines.push(') {\n')

    let itfName
    // function args
    let argArray = '['
    if (itfRequest.hasOwnProperty('arg')) {
      const reqArgs = itfRequest.arg

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
      importLines.push(`const ${itfName}Proxy = require('./${itfName}Proxy')\n`)
      codeLines.push(`\t\treturn this.display.marshallConstructor(this.id, ${opcode}, ${itfName}Proxy.constructor, ${argArray})\n`)
    } else {
      codeLines.push(`\t\tthis.display.marshall(this.id, ${opcode}, ${argArray})\n`)
    }

    codeLines.push('\t}\n')
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _writeProxy (jsonProtocol, outDir, protocolItf) {
    const itfNameOrig = protocolItf.$.name
    const itfName = upperCamelCase(itfNameOrig)
    let itfVersion = 1

    if (protocolItf.$.hasOwnProperty('version')) {
      itfVersion = parseInt(protocolItf.$.version)
    }

    console.log(`Processing interface ${itfName} v${itfVersion}`)

    const proxyName = `${itfName}Proxy`
    const proxyOut = fs.createWriteStream(path.join(outDir, `${proxyName}.js`))

    proxyOut.write('/*\n')
    jsonProtocol.protocol.copyright.forEach((val) => {
      val.split('\n').forEach((line) => {
        proxyOut.write(' *' + line + '\n')
      })
    })
    proxyOut.write(' */\n\n')

    const importLines = []
    const codeLines = []

    importLines.push('const {Proxy, WireFormat} = require(\'westfield-runtime-client\')\n')
    importLines.push('const {parseFixed, uint, uintOptional, int, intOptional, fixed, \n' +
      '\tfixedOptional, object, objectOptional, newObject, string, \n' +
      '\tstringOptional, array, arrayOptional} = WireFormat\n')

    // class docs
    const description = protocolItf.description
    if (description) {
      description.forEach((val) => {
        codeLines.push('\n/**\n')
        if (val.hasOwnProperty('_')) {
          val._.split('\n').forEach((line) => {
            codeLines.push(' *' + line + '\n')
          })
        }
        codeLines.push(' */\n')
      })
    }

    // class
    codeLines.push(`class ${proxyName} extends Proxy {\n`)

    // requests
    if (protocolItf.hasOwnProperty('request')) {
      const itfRequests = protocolItf.request
      for (let j = 0; j < itfRequests.length; j++) {
        this._parseItfRequest(codeLines, importLines, itfRequests[j], j)
      }
    }

    const eventsName = `${itfName}Events`

    // events
    if (protocolItf.hasOwnProperty('event')) {
      const itfEvents = protocolItf.event
      this._writeEvents(jsonProtocol, outDir, itfEvents, eventsName)
    }

    // constructor
    codeLines.push('\n/**\n')
    codeLines.push('\t *@param {Display}display\n')
    codeLines.push('\t */\n')
    codeLines.push('\tconstructor (display) {\n')
    codeLines.push('\t\tsuper(display)\n')
    codeLines.push('\t\t/**\n')
    codeLines.push(`\t\t * @type {${eventsName}|null}\n`)
    codeLines.push('\t\t */\n')
    codeLines.push('\t\tthis.listener = null\n')
    codeLines.push('\t}\n\n')

    // glue event functions
    if (protocolItf.hasOwnProperty('event')) {
      const itfEvents = protocolItf.event
      for (let j = 0; j < itfEvents.length; j++) {
        const itfEvent = itfEvents[j]
        let since = '1'
        if (itfEvent.$.hasOwnProperty('since')) {
          since = itfEvent.$.since
        }

        ProtocolParser._generateIfEventGlue(importLines, codeLines, itfEvent, j)
      }
    }

    codeLines.push('}\n')
    codeLines.push(`${proxyName}.protocolName = '${itfNameOrig}'\n\n`)

    // enums
    if (protocolItf.hasOwnProperty('enum')) {
      // create new files to define enums
      const itfEnums = protocolItf.enum
      for (let j = 0; j < itfEnums.length; j++) {
        const itfEnum = itfEnums[j]
        const enumName = upperCamelCase(itfEnum.$.name)

        codeLines.push(`${proxyName}.${enumName} = {\n`)

        let firstArg = true
        itfEnum.entry.forEach((entry) => {
          const entryName = camelCase(entry.$.name)
          const entryValue = entry.$.value
          const entrySummary = entry.$.summary || ''

          if (!firstArg) {
            codeLines.push(',\n')
          }
          firstArg = false

          codeLines.push('  /**\n')
          codeLines.push(`   * ${entrySummary}\n`)
          codeLines.push('   */\n')
          codeLines.push(`  ${entryName}: ${entryValue}`)
        })
        codeLines.push('\n}\n\n')
      }
    }

    codeLines.push(`module.exports = ${proxyName}\n`)

    importLines.forEach(line => {
      proxyOut.write(line)
    })
    codeLines.forEach(line => {
      proxyOut.write(line)
    })

    proxyOut.end()
  }

  /**
   * @param {Object}jsonProtocol
   * @param {string}outDir
   * @param {Object}protocolItf
   * @private
   */
  _parseInterface (jsonProtocol, outDir, protocolItf) {
    this._writeProxy(jsonProtocol, outDir, protocolItf)
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

  _writeEvents (jsonProtocol, outDir, itfEvents, eventsName) {
    const eventsFile = path.join(outDir, `${eventsName}.js`)
    const eventsOut = fs.createWriteStream(eventsFile)

    eventsOut.write('/*\n')
    jsonProtocol.protocol.copyright.forEach((val) => {
      val.split('\n').forEach((line) => {
        eventsOut.write(' *' + line + '\n')
      })
    })
    eventsOut.write(' */\n\n')

    eventsOut.write('/**\n')
    eventsOut.write(' * @interface\n')
    eventsOut.write(' */\n')
    eventsOut.write(`class ${eventsName} {\n`)

    for (let j = 0; j < itfEvents.length; j++) {
      const itfEvent = itfEvents[j]
      this._parseItfEvent(eventsOut, itfEvent)
    }

    eventsOut.write('}\n\n')
    eventsOut.write(`module.exports = ${eventsName}\n`)
    eventsOut.end()
  }
}

module.exports = ProtocolParser