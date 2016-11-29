const wf = require('../app/westfield-client-core.js');

describe("westfield-client-core", function () {
    describe("argument", function () {

        //--Integer marshalling --//

        it("marshalls a number to a non optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 0xABCDEF12;
            const arg = wf._int(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(argValue);
        });

        it("marshalls a number to an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 0xABCDEF12;
            const arg = wf._intOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(argValue);
        });

        it("marshalls a null number to an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = null;
            const arg = wf._intOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(0);
        });

        //--Float marshalling--//

        it("marshalls a number to a non optional 32bit floating point, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 1234.567;
            const arg = wf._float(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getFloat32(2).toFixed(3)).toBe(argValue.toFixed(3));
        });

        it("marshalls a number to an optional 32bit floating point, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 1234.567;
            const arg = wf._floatOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getFloat32(2).toFixed(3)).toBe(argValue.toFixed(3));
        });

        it("marshalls a null number to an optional 32bit floating, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = null;
            const arg = wf._floatOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getFloat32(2)).toBe(0);
        });

        //--Object marshalling--//

        it("marshalls a westfield object to a non optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const objectId = 0xfffe1234;
            const argValue = {_id: objectId};
            const arg = wf._object(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(objectId);
        });

        it("marshalls a westfield object to a an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const objectId = 0xfffe1234;
            const argValue = {_id: objectId};
            const arg = wf._objectOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(objectId);
        });

        it("marshalls a null westfield object to an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = null;
            const arg = wf._objectOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(0);
        });

        //--New object marshalling--//

        it("marshalls a new westfield object to a non optional 32bit integer, object type size and object type name, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(12));
            dataView.offset = 2;
            const objectId = 0xfffe1234;
            const iface = "Dummy";
            const argValue = new wf._Object(null, iface);
            argValue._id = objectId;
            const arg = wf._newObject(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(12);//2+4+1+5
            expect(dataView.getUint32(2)).toBe(objectId);
            expect(dataView.getUint8(6)).toBe(iface.length);
            expect(dataView.getUint8(7)).toBe(iface[0].codePointAt(0));//D
            expect(dataView.getUint8(8)).toBe(iface[1].codePointAt(0));//u
            expect(dataView.getUint8(9)).toBe(iface[2].codePointAt(0));//m
            expect(dataView.getUint8(10)).toBe(iface[3].codePointAt(0));//m
            expect(dataView.getUint8(11)).toBe(iface[4].codePointAt(0));//y
        });

        it("marshalls a westfield object to a an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(12));
            dataView.offset = 2;
            const objectId = 0xfffe1234;
            const iface = "Dummy";
            const argValue = new wf._Object(null, iface);
            argValue._id = objectId;
            const arg = wf._newObjectOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(12);//2+4+1+5
            expect(dataView.getUint32(2)).toBe(objectId);
            expect(dataView.getUint8(6)).toBe(iface.length);
            expect(dataView.getUint8(7)).toBe(iface[0].codePointAt(0));//D
            expect(dataView.getUint8(8)).toBe(iface[1].codePointAt(0));//u
            expect(dataView.getUint8(9)).toBe(iface[2].codePointAt(0));//m
            expect(dataView.getUint8(10)).toBe(iface[3].codePointAt(0));//m
            expect(dataView.getUint8(11)).toBe(iface[4].codePointAt(0));//y
        });

        it("marshalls a null westfield object to an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const arg = wf._newObjectOptional(null);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);//2+4
            expect(dataView.getUint32(2)).toBe(0);
        });
    });

    //--String marshalling--//

    it("marshalls a string to an array of 8bit unsigned integers, using the data view offset", function () {
        //given
        const dataView = new DataView(new ArrayBuffer(17));
        dataView.offset = 2;
        const argValue = "lorem ipsum";
        const arg = wf._string(argValue);

        //when
        arg._marshallArg(dataView);

        //then
        expect(dataView.offset).toBe(17);//2+4+11
        expect(dataView.getUint32(2)).toBe(argValue.length);
        expect(dataView.getUint8(6)).toBe(argValue[0].codePointAt(0));//l
        expect(dataView.getUint8(7)).toBe(argValue[1].codePointAt(0));//o
        expect(dataView.getUint8(8)).toBe(argValue[2].codePointAt(0));//r
        expect(dataView.getUint8(9)).toBe(argValue[3].codePointAt(0));//e
        expect(dataView.getUint8(10)).toBe(argValue[4].codePointAt(0));//m
        expect(dataView.getUint8(11)).toBe(argValue[5].codePointAt(0));//
        expect(dataView.getUint8(12)).toBe(argValue[6].codePointAt(0));//i
        expect(dataView.getUint8(13)).toBe(argValue[7].codePointAt(0));//p
        expect(dataView.getUint8(14)).toBe(argValue[8].codePointAt(0));//s
        expect(dataView.getUint8(15)).toBe(argValue[9].codePointAt(0));//u
        expect(dataView.getUint8(16)).toBe(argValue[10].codePointAt(0));//m
    });

    it("marshalls an optional string to an array of 8bit unsigned integers, using the data view offset", function () {
        //given
        const dataView = new DataView(new ArrayBuffer(17));
        dataView.offset = 2;
        const argValue = "lorem ipsum";
        const arg = wf._stringOptional(argValue);

        //when
        arg._marshallArg(dataView);

        //then
        expect(dataView.offset).toBe(17);//2+4+11
        expect(dataView.getUint32(2)).toBe(argValue.length);
        expect(dataView.getUint8(6)).toBe(argValue[0].codePointAt(0));//l
        expect(dataView.getUint8(7)).toBe(argValue[1].codePointAt(0));//o
        expect(dataView.getUint8(8)).toBe(argValue[2].codePointAt(0));//r
        expect(dataView.getUint8(9)).toBe(argValue[3].codePointAt(0));//e
        expect(dataView.getUint8(10)).toBe(argValue[4].codePointAt(0));//m
        expect(dataView.getUint8(11)).toBe(argValue[5].codePointAt(0));//
        expect(dataView.getUint8(12)).toBe(argValue[6].codePointAt(0));//i
        expect(dataView.getUint8(13)).toBe(argValue[7].codePointAt(0));//p
        expect(dataView.getUint8(14)).toBe(argValue[8].codePointAt(0));//s
        expect(dataView.getUint8(15)).toBe(argValue[9].codePointAt(0));//u
        expect(dataView.getUint8(16)).toBe(argValue[10].codePointAt(0));//m
    });

    it("marshalls an optional null string to an array of 8bit unsigned integers, using the data view offset", function () {
        //given
        const dataView = new DataView(new ArrayBuffer(6));
        dataView.offset = 2;
        const arg = wf._stringOptional(null);

        //when
        arg._marshallArg(dataView);

        //then
        expect(dataView.offset).toBe(6);//2+4
        expect(dataView.getUint32(2)).toBe(0);
    });

    //--Array marshalling--//

    //TODO fixup array endianess problem
    // it("marshalls an array type to an array of 8bit unsigned integers, using the data view offset", function () {
    //     //given
    //     const dataView = new DataView(new ArrayBuffer(14));
    //     dataView.offset = 2;
    //     const argValue = new Uint32Array(new ArrayBuffer(8));
    //     argValue[0] = 0xF1234567;
    //     argValue[1] = 0x1234567F;
    //
    //     const arg = wf._array(argValue);
    //
    //     //when
    //     arg._marshallArg(dataView);
    //
    //     //then
    //     expect(dataView.offset).toBe(14);//2+4+8
    //     expect(dataView.getUint32(2)).toBe(argValue.buffer.byteLength);
    //     expect(dataView.getUint32(6)).toBe(0xF1234567);//0xF1234567
    //     expect(dataView.getUint32(10)).toBe(0x1234567F);//0x1234567F
    // });
});
