#!/usr/bin/env node
'use strict';

const fs = require('fs');
const util = require('util');
const xml2js = require('xml2js');
const meow = require('meow');

const wfg = {};

wfg.ProtocolParser = class {

    ["uint"](argName, optional) {
        return {
            signature: optional ? "?u" : "u",
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfs._uintOptional(%s)", argName) : util.format("wfs._uint(%s)", argName)
        };
    }

    ["int"](argName, optional) {
        return {
            signature: optional ? "?i" : "i",
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfs._intOptional(%s)", argName) : util.format("wfs._int(%s)", argName)
        };
    }

    ["fixed"](argName, optional) {
        return {
            signature: optional ? "?f" : "f",
            jsType: optional ? "?Fixed" : "Fixed",
            marshallGen: optional ? util.format("wfs._fixedOptional(%s)", argName) : util.format("wfs._fixed(%s)", argName)
        };
    }

    ["object"](argName, optional) {
        return {
            signature: optional ? "?o" : "o",
            jsType: optional ? "?*" : "*",
            marshallGen: optional ? util.format("wfs._objectOptional(%s)", argName) : util.format("wfs._object(%s)", argName)
        };
    }

    ["new_id"](argName, optional) {
        return {
            signature: optional ? "?n" : "n",
            jsType: "*",
            marshallGen: "wfs._newObject()"
        };
    }

    ["string"](argName, optional) {
        return {
            signature: optional ? "?s" : "s",
            jsType: optional ? "?string" : "string",
            marshallGen: optional ? util.format("wfs._stringOptional(%s)", argName) : util.format("wfs._string(%s)", argName)
        };
    }

    ["array"](argName, optional) {
        return {
            signature: optional ? "?a" : "a",
            jsType: optional ? "?ArrayBuffer" : "ArrayBuffer",
            marshallGen: optional ? util.format("wfs._arrayOptional(%s)", argName) : util.format("wfs._array(%s)", argName)
        };
    }

    static _generateEventArgs(out, req) {
        if (req.hasOwnProperty("arg")) {
            const evArgs = req.arg;
            let processedFirstArg = false;
            for (let i = 0; i < evArgs.length; i++) {
                const arg = evArgs[i];
                if (arg.$.type === "new_id") {
                    continue;
                }

                const argName = arg.$.name;
                if (processedFirstArg) {
                    out.write(", ");
                }
                out.write(argName);
                processedFirstArg = true;
            }
        }
    }

    static _generateRequestArgs(out, ev) {
        if (ev.hasOwnProperty("arg")) {
            const evArgs = ev.arg;
            for (let i = 0; i < evArgs.length; i++) {
                const arg = evArgs[i];
                const argName = arg.$.name;
                if (i !== 0) {
                    out.write(", ");
                }
                out.write(argName);
            }
        }
    }

    _parseRequestSignature(ev) {
        let evSig = "";
        if (ev.hasOwnProperty("arg")) {
            const evArgs = ev.arg;
            for (let i = 0; i < evArgs.length; i++) {
                const arg = evArgs[i];

                const argName = arg.$.name;
                const optional = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                const argType = arg.$.type;

                evSig += this[argType](argName, optional).signature;
            }
        }

        return evSig;
    }

    _generateIfRequestGlue(out, ev, opcode) {

        const evName = ev.$.name;

        out.write(util.format("\t[%d](message){\n", opcode));
        const evSig = this._parseRequestSignature(ev);
        out.write(util.format("\t\tconst args = this.client._unmarshallArgs(message,\"%s\");\n", evSig));
        out.write(util.format("\t\tthis.implementation.%s.call(this.implementation, this", evName));

        if (ev.hasOwnProperty("arg")) {
            const evArgs = ev.arg;
            for (let i = 0; i < evArgs.length; i++) {
                out.write(", ");
                const arg = evArgs[i];
                const argType = arg.$.type;
                out.write(util.format("args[%d]", i));
                if (argType === "new_id") {
                    const argItf = arg.$["interface"];
                    out.write(util.format("(\"%s\")", argItf));
                }
            }
        }

        out.write(");\n");
        out.write("\t}\n\n");
    }

    _parseItfRequest(out, itfRequest) {
        const sinceVersion = itfRequest.$.hasOwnProperty("since") ? parseInt(itfRequest.$.since) : 1;
        const evName = itfRequest.$.name;

        //function docs
        const description = itfRequest.description;
        description.forEach((val) => {
            out.write("\n\t\t\t/**\n");
            if (val.hasOwnProperty("_")) {
                val._.split("\n").forEach((line) => {
                    out.write("\t\t\t *" + line + "\n");
                });
            }

            if (itfRequest.hasOwnProperty("arg")) {
                const evArgs = itfRequest.arg;
                out.write("\t\t\t *\n");
                evArgs.forEach((arg) => {
                    const argDescription = arg.$.summary;
                    const argName = arg.$.name;
                    const optional = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                    const argType = arg.$.type;

                    out.write(util.format("\t\t\t * @param {%s} %s %s \n", this[argType](argName, optional).jsType, argName, argDescription));
                });
                out.write("\t\t\t *\n");

            }
            out.write(util.format("\t\t\t * @since %d\n", sinceVersion));
            out.write("\t\t\t *\n");
            out.write("\t\t\t */\n");
        });

        //function
        out.write(util.format("\t\t\t%s(", evName));
        wfg.ProtocolParser._generateRequestArgs(out, itfRequest);
        out.write(") {},\n");
    }

    _parseItfEvent(out, itfEvent, opcode, itfVersion) {

        const sinceVersion = itfEvent.$.hasOwnProperty("since") ? parseInt(itfEvent.$.since) : 1;
        if (sinceVersion !== itfVersion) {
            return;
        }

        const reqName = itfEvent.$.name;

        //function docs
        const description = itfEvent.description;
        description.forEach((val) => {
            out.write("\n\t/**\n");
            if (val.hasOwnProperty("_")) {
                val._.split("\n").forEach((line) => {
                    out.write("\t *" + line + "\n");
                });
            }

            if (itfEvent.hasOwnProperty("arg")) {
                const reqArgs = itfEvent.arg;
                out.write("\t *\n");
                reqArgs.forEach((arg) => {
                    const argDescription = arg.$.summary;
                    const argName = arg.$.name;
                    const optional = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                    const argType = arg.$.type;
                    if (argType !== "new_id") {
                        out.write(util.format("\t * @param {%s} %s %s \n", this[argType](argName, optional).jsType, argName, argDescription));
                    }
                });

                reqArgs.forEach((arg) => {
                    const argDescription = arg.$.summary;
                    const argItf = arg.$["interface"];
                    const argType = arg.$.type;
                    if (argType === "new_id") {
                        out.write(util.format("\t * @return {%s} %s \n", argItf, argDescription));
                    }
                });
                out.write("\t *\n");

            }
            out.write(util.format("\t * @since %d\n", sinceVersion));
            out.write("\t *\n");
            out.write("\t */\n");
        });

        //function
        out.write(util.format("\t%s(", reqName));
        wfg.ProtocolParser._generateEventArgs(out, itfEvent);
        out.write(") {\n");


        let itfName;
        //function args
        let argArray = "[";
        if (itfEvent.hasOwnProperty("arg")) {
            const reqArgs = itfEvent.arg;


            for (let i = 0; i < reqArgs.length; i++) {
                const arg = reqArgs[i];
                const argType = arg.$.type;
                const argName = arg.$.name;
                const optional = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");

                if (argType === "new_id") {
                    itfName = arg.$["interface"];
                }

                if (i !== 0) {
                    argArray += ", ";
                }

                argArray += this[argType](argName, optional).marshallGen;
            }
        }
        argArray += "]";

        if (itfName) {
            out.write(util.format("\t\treturn this.client._marshallConstructor(this._id, %d, \"%s\", %s);\n", opcode, itfName, argArray));
        } else {
            out.write(util.format("\t\tthis.client._marshall(this._id, %d, %s);\n", opcode, argArray));
        }

        out.write("\t}\n");
    }

    _parseInterface(out, protocolItf) {
        const itfName = protocolItf.$.name;
        let itfVersion = 1;

        if (protocolItf.$.hasOwnProperty("version")) {
            itfVersion = parseInt(protocolItf.$.version);
        }

        console.log(util.format("Processing interface %s v%d", itfName, itfVersion));

        for (let i = 1; i <= itfVersion; i++) {

            //class docs
            const description = protocolItf.description;
            if (description) {
                description.forEach((val) => {
                    out.write("\n/**\n");
                    if (val.hasOwnProperty("_")) {
                        val._.split("\n").forEach((line) => {
                            out.write(" *" + line + "\n");
                        });
                    }
                    out.write(" */\n");
                });
            }

            //class
            if (i === 1) {
                out.write(util.format("wfs.%s = class %s extends wfs.Resource {\n", itfName, itfName));
            } else {
                const className = util.format("%sV%d", itfName, i);
                if (i === 2) {
                    out.write(util.format("wfs.%s = class %s extends wfs.%s {\n", className, className, itfName));
                } else {
                    out.write(util.format("wfs.%s = class %s extends wfs.%sV%d {\n", className, className, itfName, i - 1));
                }
            }

            //events
            if (protocolItf.hasOwnProperty("event")) {
                const itfEvents = protocolItf.event;
                for (let j = 0; j < itfEvents.length; j++) {
                    this._parseItfEvent(out, itfEvents[j], j + 1, i);
                }
            }

            //constructor
            out.write("\n\tconstructor(client) {\n");
            out.write("\t\tsuper(client, {\n");
            out.write(util.format("\t\t\tname: \"%s\",\n", itfName));
            out.write(util.format("\t\t\tversion: %d,\n", i));
            //requests
            if (protocolItf.hasOwnProperty("request")) {

                const itfRequests = protocolItf.request;
                for (let j = 0; j < itfRequests.length; j++) {
                    const itfRequest = itfRequests[j];
                    let since = "1";
                    if (itfRequest.$.hasOwnProperty("since")) {
                        since = itfRequest.$.since;
                    }

                    if (parseInt(since) <= i) {
                        this._parseItfRequest(out, itfRequest);
                    }
                }
            }
            out.write("\t\t});\n");
            out.write("\t}\n\n");

            //glue event functions
            if (protocolItf.hasOwnProperty("request")) {
                const itfRequests = protocolItf.request;
                for (let j = 0; j < itfRequests.length; j++) {
                    const itfRequest = itfRequests[j];
                    let since = "1";
                    if (itfRequest.$.hasOwnProperty("since")) {
                        since = itfRequest.$.since;
                    }

                    if (parseInt(since) === i) {
                        this._generateIfRequestGlue(out, itfRequest, j + 1);
                    }
                }
            }

            out.write("};\n");
        }
    }

    _parseProtocol(jsonProtocol) {
        const protocolName = jsonProtocol.protocol.$.name;
        const out = fs.createWriteStream(util.format("westfield-server-%s.js", protocolName));
        out.on('open', (fd) => {
            out.write("/*\n");
            jsonProtocol.protocol.copyright.forEach((val) => {
                val.split("\n").forEach((line) => {
                    out.write(" *" + line + "\n");
                });
            });
            out.write(" */\n");

            jsonProtocol.protocol.interface.forEach((itf) => {
                this._parseInterface(out, itf);
            });

            console.log('Done');
        });
    }

    parse() {
        fs.readFile(this.protocolFile, (err, data) => {
            if (err) throw err;
            new xml2js.Parser().parseString(data, (err, result) => {
                if (err) throw err;

                //uncomment to see the protocol as json output
                //console.log(util.inspect(result, false, null));

                this._parseProtocol(result);
            });
        });
    }

    constructor(protocolFile) {
        this.protocolFile = protocolFile;
    }
};

const cli = meow(`Usage:
        westfield-scanner.js FILE... [options]

    Generates a javascript server-side protocol file based on the given FILE argument.
    The FILE argument is a relative or absolute path to a Westfield compatible Wayland XML.
    The generated javascript protocol file is named "westfield-client-FILE.js".

    Options:
        -h, --help         print usage information
        -v, --version      show version info and exit
        
`, {});

cli.input.forEach((protocol) => {
    new wfg.ProtocolParser(protocol).parse();
});
