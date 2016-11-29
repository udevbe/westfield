const wfc = require('../app/westfield-client-core.js');

describe("westfield-client-core", function () {
    describe("argument", function () {
        it("marshalls a number to a non optional 32bit integer, using the data view offset", function () {
            //given
            let dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            let argValue = 0xABCDEF12;
            let intArg = wfc._int(argValue);

            //when
            intArg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(argValue);
        });
    });
});
