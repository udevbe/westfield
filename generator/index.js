const fs = require('fs');
const util = require('util');

const xml2js = require('xml2js');
const escodegen = require('escodegen');

//TODO parse wayland xml & output js that makes use of core library
const wfg = {};

wfg.ProtocolParser = class {

    _parseInterface(protocolItf) {
        const itfName = protocolItf.$.name;
        const itfVersion = protocolItf.$.version;
        const itfDesc = protocolItf.description[0]._;
        const itfSummary = protocolItf.description[0].$.summary;

        console.log(util.format("Processing interface %s v%d", itfName, itfVersion));

    }

    _parseInterfaces(jsonProtocol) {
        //TODO create source file
        //TODO process protocol name & header
        jsonProtocol.protocol.interface.forEach(this._parseInterface)
    }

    parse() {
        fs.readFile(this.protocolFile, (err, data) => {
            if (err) throw err;
            new xml2js.Parser().parseString(data, (err, result) => {
                if (err) throw err;

                //uncomment to see the protocol as json output
                //console.log(util.inspect(result, false, null));

                this._parseInterfaces(result);
                console.log('Done');
            });
        });
    }

    constructor(protocolFile) {
        this.protocolFile = protocolFile;
    }
}


new wfg.ProtocolParser('/usr/share/wayland/wayland.xml').parse();



