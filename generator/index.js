const fs = require('fs');
const util = require('util');

const xml2js = require('xml2js');

const wfg = {};

wfg.ProtocolParser = class {

    _parseInterface(out, protocolItf) {
        const itfName = protocolItf.$.name;
        const itfVersion = protocolItf.$.version;
        const itfDesc = protocolItf.description[0]._;
        const itfSummary = protocolItf.description[0].$.summary;

        console.log(util.format("Processing interface %s v%d", itfName, itfVersion));

        //if version is 1, we extends from WObject, else we extend from the previous version.
        out.write(util.format("wfc.%sV%d = class %s extends wfc.WObject {\n", itfName, itfVersion, itfName));
        out.write("};\n");
    }

    _parseProtocol(jsonProtocol) {
        const protocolName = jsonProtocol.protocol.$.name;
        const out = fs.createWriteStream(util.format("westfield-client-%s.js", protocolName));
        out.on('open', (fd) => {
            jsonProtocol.protocol.copyright.forEach((val) => {
                val.split("\n").forEach((line) => {
                    out.write("//" + line + "\n");
                });
            });

            jsonProtocol.protocol.interface.forEach((itf) => {
                this._parseInterface(out, itf);
            });
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
                console.log('Done');
            });
        });
    }

    constructor(protocolFile) {
        this.protocolFile = protocolFile;
    }
}


new wfg.ProtocolParser('/usr/share/wayland/wayland.xml').parse();



