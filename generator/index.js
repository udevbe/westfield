const fs = require('fs');
const util = require('util');

const xml2js = require('xml2js');

const wfg = {};

wfg.ProtocolParser = class {

    //TODO remove
    ["uint"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._intOptional(%s)", argName) : util.format("wfc._int(%s)", argName)
        };
    }

    //TODO remove
    ["fixed"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._floatOptional(%s)", argName) : util.format("wfc._float(%s)", argName)
        };
    }

    //TODO remove
    ["fd"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._intOptional(%s)", argName) : util.format("wfc._int(%s)", argName)
        };
    }


    ["int"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._intOptional(%s)", argName) : util.format("wfc._int(%s)", argName)
        };
    }

    ["float"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._floatOptional(%s)", argName) : util.format("wfc._float(%s)", argName)
        };
    }

    ["double"](argName, optional) {
        return {
            jsType: optional ? "?Number" : "Number",
            marshallGen: optional ? util.format("wfc._doubleOptional(%s)", argName) : util.format("wfc._double(%s)", argName)
        };
    }

    ["object"](argName, optional) {
        return {
            jsType: optional ? "?*" : "*",
            marshallGen: optional ? util.format("wfc._objectOptional(%s)", argName) : util.format("wfc._object(%s)", argName)
        };
    }

    ["new_id"](argName, optional) {
        return {
            jsType: optional ? "?*" : "*",
            marshallGen: optional ? util.format("wfc._newObjectOptional(%s)", argName) : util.format("wfc._newObject(%s)", argName)
        };
    }

    ["string"](argName, optional) {
        return {
            jsType: optional ? "?string" : "string",
            marshallGen: optional ? util.format("wfc._stringOptional(%s)", argName) : util.format("wfc._string(%s)", argName)
        };
    }

    ["array"](argName, optional) {
        return {
            jsType: optional ? "?ArrayBuffer" : "ArrayBuffer",
            marshallGen: optional ? util.format("wfc._arrayOptional(%s)", argName) : util.format("wfc._array(%s)", argName)
        };
    }

    _generateArgs(out, evReq) {
        if (evReq.hasOwnProperty("arg")) {
            const evArgs = evReq.arg;
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

    _generateIfEventGlue(out, itfEvent, opcode) {

        const evName = itfEvent.$.name;

        out.write(util.format("\t[%d](", opcode));
        this._generateArgs(out, itfEvent);
        out.write("){\n");
        out.write(util.format("\t\tthis._iface.%s(", evName));
        this._generateArgs(out, itfEvent);
        out.write(");\n");
        out.write("\t}\n\n");
    }

    _parseItfEvent(out, itfEvent) {
        const sinceVersion = itfEvent.$.hasOwnProperty("since") ? parseInt(itfEvent.$.since) : 1;
        const evName = itfEvent.$.name;

        //function docs
        const description = itfEvent.description;
        description.forEach((val) => {
            out.write("\n\t\t\t/**\n");
            if (val.hasOwnProperty("_")) {
                val._.split("\n").forEach((line) => {
                    out.write("\t\t\t *" + line + "\n");
                });
            }

            if (itfEvent.hasOwnProperty("arg")) {
                const evArgs = itfEvent.arg;
                out.write("\t\t\t *\n");
                evArgs.forEach((arg) => {
                    const argDescription = arg.$.summary;
                    const argName = arg.$.name;
                    const argType = arg.$.type;

                    const allowNull = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                    out.write(util.format("\t\t\t * @param {%s} %s %s \n", this[argType](argName, allowNull).jsType, argName, argDescription));
                });
                out.write("\t\t\t *\n");

            }
            out.write(util.format("\t\t\t * @since %d\n", sinceVersion));
            out.write("\t\t\t *\n");
            out.write("\t\t\t */\n");
        });

        //function
        out.write(util.format("\t\t\t%s(", evName));
        this._generateArgs(out, itfEvent);
        out.write(") {},\n");
    }

    _parseItfRequest(out, itfRequest, opcode, itfVersion) {

        const sinceVersion = itfRequest.$.hasOwnProperty("since") ? parseInt(itfRequest.$.since) : 1;
        if (sinceVersion !== itfVersion) {
            return;
        }

        const reqName = itfRequest.$.name;

        //function docs
        const description = itfRequest.description;
        description.forEach((val) => {
            out.write("\n\t/**\n");
            if (val.hasOwnProperty("_")) {
                val._.split("\n").forEach((line) => {
                    out.write("\t *" + line + "\n");
                });
            }

            if (itfRequest.hasOwnProperty("arg")) {
                const reqArgs = itfRequest.arg;
                out.write("\t *\n");
                reqArgs.forEach((arg) => {
                    const argDescription = arg.$.summary;
                    const argName = arg.$.name;
                    const argType = arg.$.type;

                    const allowNull = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                    out.write(util.format("\t * @param {%s} %s %s \n", this[argType](argName, allowNull).jsType, argName, argDescription));
                });
                out.write("\t *\n");

            }
            out.write(util.format("\t * @since %d\n", sinceVersion));
            out.write("\t *\n");
            out.write("\t */\n");
        });

        //function
        out.write(util.format("\t%s(", reqName));
        this._generateArgs(out, itfRequest);
        out.write(") {\n");
        out.write(util.format("\t\tthis._connection._marshall(this._id, %d, [", opcode));

        //function args
        if (itfRequest.hasOwnProperty("arg")) {
            const reqArgs = itfRequest.arg;
            for (let i = 0; i < reqArgs.length; i++) {
                const arg = reqArgs[i];

                const argName = arg.$.name;
                const argType = arg.$.type;

                if (i !== 0) {
                    out.write(", ");
                }

                const allowNull = arg.$.hasOwnProperty("allow-null") && (arg.$["allow-null"] === "true");
                out.write(this[argType](argName, allowNull).marshallGen);
            }
        }

        out.write(util.format("]);\n"));
        out.write("\t}\n");
    }

    _parseInterface(out, protocolItf) {
        const itfName = protocolItf.$.name;
        const itfVersion = protocolItf.$.version;

        console.log(util.format("Processing interface %s v%d", itfName, itfVersion));

        for (let i = 1; i <= itfVersion; i++) {

            //class docs
            const description = protocolItf.description;
            description.forEach((val) => {
                out.write("\n/**\n");
                if (val.hasOwnProperty("_")) {
                    val._.split("\n").forEach((line) => {
                        out.write(" *" + line + "\n");
                    });
                }
                out.write(" */\n");
            });

            //class
            if (i === 1) {
                out.write(util.format("wfc.%s = class %s extends wfc.WObject {\n", itfName, itfName));
            } else {
                const className = util.format("%sV%d", itfName, i);
                if (i === 2) {
                    out.write(util.format("wfc.%s = class %s extends wfc.%s {\n", className, className, itfName));
                } else {
                    out.write(util.format("wfc.%s = class %s extends wfc.%sV%d {\n", className, className, itfName, i - 1));
                }
            }

            //requests
            if (protocolItf.hasOwnProperty("request")) {
                const itfRequests = protocolItf.request;
                for (let j = 0; j < itfRequests.length; j++) {
                    this._parseItfRequest(out, itfRequests[j], j + 1, i);
                }
            }

            //constructor
            out.write("\n\tconstructor(connection) {\n");
            out.write("\t\tsuper(connection, {\n");
            out.write(util.format("\t\t\tname: \"%s\",\n", itfName));
            //events
            if (protocolItf.hasOwnProperty("event")) {
                protocolItf.event.forEach((event) => {
                    this._parseItfEvent(out, event);
                });
            }
            out.write("\t\t});\n");
            out.write("\t}\n\n");

            //glue event functions
            if (protocolItf.hasOwnProperty("event")) {
                const itfEvents = protocolItf.event;
                for (let j = 0; j < itfEvents.length; j++) {
                    this._generateIfEventGlue(out, itfEvents[j], j + 1);
                }
            }


            out.write("};\n");
        }
    }

    _parseProtocol(jsonProtocol) {
        const protocolName = jsonProtocol.protocol.$.name;
        const out = fs.createWriteStream(util.format("westfield-client-%s.js", protocolName));
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
}


new wfg.ProtocolParser('/usr/share/wayland/wayland.xml').parse();



