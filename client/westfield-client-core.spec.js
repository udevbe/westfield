const wf = require('./westfield-client-core.js');

describe("westfield-client-core", function () {

    const customMatchers = {
        toBeBlobEqual: function (util, customEqualityTesters) {
            return {
                compare: function (buf1, buf2) {
                    return {
                        pass: (function () {
                            if (buf1.byteLength != buf2.byteLength) {
                                return false;
                            }

                            const dv1 = new Uint8Array(buf1);
                            const dv2 = new Uint8Array(buf2);

                            for (let i = 0; i < buf1.byteLength; i++) {
                                if (dv1[i] != dv2[i]) {
                                    return false;
                                }
                            }

                            return true;
                        })()
                    }
                }
            };
        }
    };

    beforeEach(function () {
        jasmine.addMatchers(customMatchers);
    });

    describe("Fixed type", function () {
        it("converts back and forth using the positive range of a non fractional 24-bit number", function () {
            for (let i = 0; i <= 0x007FFFFF; i++) {
                const fixed = new wf.parseFixed(i);
                if (i !== fixed.asInt()) {
                    expect(fixed.asInt()).toBe(i);
                    //break else node will go OO
                    break;
                }
            }
        });

        it("converts back and forth using the negative range of a non fractional 24-bit number", function () {
            for (let i = 0; i <= 0x007FFFFF; i++) {
                const fixed = new wf.parseFixed(-i);
                if (-i !== fixed.asInt()) {
                    expect(fixed.asInt()).toBe(-i);
                    break;
                }
            }
        });

        //tests are disabled as they take some time (+- 3min) to complete

        // it("converts back and forth using the positive range of a 24-bit number and an 8-bit fraction", function () {
        //     for (let i = 0.0; i < 0x00800000; i += 0.00390625) {
        //         const fixed = new wf.parseFixed(i);
        //         if (i !== fixed.asDoube()) {
        //             expect(fixed.asDoube()).toBe(i);
        //             break;
        //         }
        //     }
        // });
        //
        // it("converts back and forth using the negative range of a 24-bit number and an 8-bit fraction", function () {
        //     for (let i = 0; i < 0x00800000; i += 0.00390625) {
        //         const fixed = new wf.parseFixed(-i);
        //         if (-i !== fixed.asDoube()) {
        //             expect(fixed.asDoube()).toBe(-i);
        //             break;
        //         }
        //     }
        // });
    });

    describe("argument marshalling", function () {

        //--Unsigned integer marshalling --//
        it("marshalls a number to a non optional 32bit unsgined integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 0x87654321;
            const arg = wf._uint(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(argValue);
        });

        it("marshalls a number to an optional 32bit unsigned integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 0x87654321;
            const arg = wf._uintOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(argValue);
        });

        it("marshalls a null number to an optional 32bit unsigned integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = null;
            const arg = wf._uintOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getUint32(2)).toBe(0);
        });

        //--Integer marshalling --//

        it("marshalls a number to a non optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = -123456789;
            const arg = wf._int(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getInt32(2)).toBe(argValue);
        });

        it("marshalls a number to an optional 32bit integer, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = -123456789;
            const arg = wf._intOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(dataView.getInt32(2)).toBe(argValue);
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
            expect(dataView.getInt32(2)).toBe(0);
        });

        //--Fixed marshalling--//

        it("marshalls a number to a non optional fixed, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 1234.567;
            const arg = wf._fixed(wf.parseFixed(argValue));

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(new wf.WFixed(dataView.getInt32(2)).asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("marshalls a number to an optional 32bit fixed, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = 1234.567;
            const arg = wf._fixedOptional(wf.parseFixed(argValue));

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(new wf.WFixed(dataView.getInt32(2)).asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("marshalls a null number to an optional 32bit fixed, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;
            const argValue = null;
            const arg = wf._fixedOptional(wf.parseFixed(argValue));

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);
            expect(new wf.WFixed(dataView.getInt32(2)).asDouble()).toBe(0);
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
            const iface = {name: "Dummy"};
            const argValue = new wf.WObject(null, iface);
            argValue._id = objectId;
            const arg = wf._newObject();

            arg.value = argValue;
            arg.size = 4 + 1 + argValue.iface.name.length;

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(12);//2+4+1+5
            expect(dataView.getUint32(2)).toBe(objectId);
            expect(dataView.getUint8(6)).toBe(iface.name.length);
            expect(dataView.getUint8(7)).toBe(iface.name[0].codePointAt(0));//D
            expect(dataView.getUint8(8)).toBe(iface.name[1].codePointAt(0));//u
            expect(dataView.getUint8(9)).toBe(iface.name[2].codePointAt(0));//m
            expect(dataView.getUint8(10)).toBe(iface.name[3].codePointAt(0));//m
            expect(dataView.getUint8(11)).toBe(iface.name[4].codePointAt(0));//y
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

        it("marshalls a typed array to an array of 8bit unsigned integers, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(14));
            dataView.offset = 2;
            const argValue = new Uint32Array(new ArrayBuffer(8));
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const arg = wf._array(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(14);//2+4+8
            expect(dataView.getInt32(2)).toBe(argValue.buffer.byteLength);
            let intArray = new Uint32Array(dataView.buffer.slice(6, 14), 0, 2);
            expect(intArray[0]).toBe(0xF1234567);//0xF1234567
            expect(intArray[1]).toBe(0x1234567F);//0x1234567F
        });

        it("marshalls an optional typed array to an array of 8bit unsigned integers, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(14));
            dataView.offset = 2;
            const argValue = new Uint32Array(new ArrayBuffer(8));
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const arg = wf._arrayOptional(argValue);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(14);//2+4+8
            expect(dataView.getInt32(2)).toBe(argValue.buffer.byteLength);
            let intArray = new Uint32Array(dataView.buffer.slice(6, 14), 0, 2);
            expect(intArray[0]).toBe(argValue[0]);//0xF1234567
            expect(intArray[1]).toBe(argValue[1]);//0x1234567F
        });

        it("marshalls an optional null typed array to an array of 8bit unsigned integers, using the data view offset", function () {
            //given
            const dataView = new DataView(new ArrayBuffer(6));
            dataView.offset = 2;

            const arg = wf._arrayOptional(null);

            //when
            arg._marshallArg(dataView);

            //then
            expect(dataView.offset).toBe(6);//2+4
            expect(dataView.getInt32(2)).toBe(0);
        });
    });


    describe("argument unmarshalling", function () {

        //--Unsigned Integer Unmarshalling--//

        it("unmarshalls a non optional 32bit unsigned integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(5));//1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "u".codePointAt(0));
            const argValue = 6553699;
            wireArg.setUint32(1, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(5);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls a non null optional 32bit unsigned integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "u".codePointAt(0));
            const argValue = 6553699;
            wireArg.setUint32(2, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls a zero optional 32bit unsigned integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "u".codePointAt(0));
            const argValue = 0;
            wireArg.setUint32(2, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(argValue);
        });

        //--Integer Unmarshalling--//

        it("unmarshalls a non optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(5));//1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "i".codePointAt(0));
            const argValue = -6553699;
            wireArg.setInt32(1, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(5);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls a non null optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "i".codePointAt(0));
            const argValue = -6553699;
            wireArg.setInt32(2, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls a zero optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "i".codePointAt(0));
            const argValue = 0;
            wireArg.setInt32(2, argValue);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(argValue);
        });

        //--Fixed Unmarshalling--//

        it("unmarshalls a non optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(5));//1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "f".codePointAt(0));
            const argValue = 1234.567;
            wireArg.setInt32(1, wf.parseFixed(argValue)._raw);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(5);
            expect(arg.asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("unmarshalls a non zero optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "f".codePointAt(0));
            const argValue = 1234.567;
            wireArg.setInt32(2, wf.parseFixed(argValue)._raw);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg.asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("unmarshalls a zero optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "f".codePointAt(0));
            const argValue = 0;
            wireArg.setInt32(2, wf.parseFixed(argValue)._raw);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg.asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        //--Object Unmarshalling--//

        it("unmarshalls a non optional 32bit integer to an object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            connection._objects.set(objectId, {_id: objectId});

            const wireArg = new DataView(new ArrayBuffer(5));//1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "o".codePointAt(0));
            wireArg.setUint32(1, objectId);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(5);
            expect(arg._id).toBe(objectId);
        });

        it("unmarshalls a non zero optional 32bit integer to an object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            connection._objects.set(objectId, {_id: objectId});

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "o".codePointAt(0));
            wireArg.setUint32(2, objectId);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg._id).toBe(objectId);
        });

        it("unmarshalls a zero optional 32bit integer to an object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            const objectId = 0;

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "o".codePointAt(0));
            wireArg.setUint32(2, objectId);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(null);
        });

        //--New object Unmarshalling--//

        it("unmarshalls a non optional 32bit integer to a new object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            const objectType = "Dummy";
            wf.Dummy = function () {
            };

            const wireArg = new DataView(new ArrayBuffer(11));//1+4+1+(1*5)
            wireArg.offset = 0;
            wireArg.setUint8(0, "n".codePointAt(0));
            wireArg.setUint32(1, objectId);
            wireArg.setUint8(5, objectType.length);
            wireArg.setUint8(6, objectType.codePointAt(0));//D
            wireArg.setUint8(7, objectType.codePointAt(1));//u
            wireArg.setUint8(8, objectType.codePointAt(2));//m
            wireArg.setUint8(9, objectType.codePointAt(3));//m
            wireArg.setUint8(10, objectType.codePointAt(4));//y

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(11);
            expect(arg).toBe(connection._objects.get(arg._id));
        });

        it("unmarshalls an optional non zero 32bit integer to a new object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            const objectType = "Dummy";
            wf.Dummy = function () {
            };

            const wireArg = new DataView(new ArrayBuffer(12));//1+1+4+1+(1*5)
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "n".codePointAt(0));
            wireArg.setUint32(2, objectId);
            wireArg.setUint8(6, objectType.length);
            wireArg.setUint8(7, objectType.codePointAt(0));//D
            wireArg.setUint8(8, objectType.codePointAt(1));//u
            wireArg.setUint8(9, objectType.codePointAt(2));//m
            wireArg.setUint8(10, objectType.codePointAt(3));//m
            wireArg.setUint8(11, objectType.codePointAt(4));//y

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(12);
            expect(arg).toBe(connection._objects.get(arg._id));
        });

        it("unmarshalls an optional zero 32bit integer to a new object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._objects = new Map();
            const objectId = 0;

            const wireArg = new DataView(new ArrayBuffer(12));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "n".codePointAt(0));
            wireArg.setUint32(2, objectId);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(null);
        });

        //--String Unmarshalling--//

        it("unmarshalls a non optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");

            const argValue = "lorem ipsum";
            const wireArg = new DataView(new ArrayBuffer(16));//1+4+11
            wireArg.offset = 0;
            wireArg.setUint8(0, "s".codePointAt(0));
            wireArg.setUint32(1, argValue.length);
            wireArg.setUint8(5, argValue.codePointAt(0));//l
            wireArg.setUint8(6, argValue.codePointAt(1));//o
            wireArg.setUint8(7, argValue.codePointAt(2));//r
            wireArg.setUint8(8, argValue.codePointAt(3));//u
            wireArg.setUint8(9, argValue.codePointAt(4));//m
            wireArg.setUint8(10, argValue.codePointAt(5));//
            wireArg.setUint8(11, argValue.codePointAt(6));//i
            wireArg.setUint8(12, argValue.codePointAt(7));//p
            wireArg.setUint8(13, argValue.codePointAt(8));//s
            wireArg.setUint8(14, argValue.codePointAt(9));//u
            wireArg.setUint8(15, argValue.codePointAt(10));//m

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(16);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls a non empty optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");

            const argValue = "lorem ipsum";
            const wireArg = new DataView(new ArrayBuffer(17));//1+1+4+11
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "s".codePointAt(0));
            wireArg.setUint32(2, argValue.length);
            wireArg.setUint8(6, argValue.codePointAt(0));//l
            wireArg.setUint8(7, argValue.codePointAt(1));//o
            wireArg.setUint8(8, argValue.codePointAt(2));//r
            wireArg.setUint8(9, argValue.codePointAt(3));//u
            wireArg.setUint8(10, argValue.codePointAt(4));//m
            wireArg.setUint8(11, argValue.codePointAt(5));//
            wireArg.setUint8(12, argValue.codePointAt(6));//i
            wireArg.setUint8(13, argValue.codePointAt(7));//p
            wireArg.setUint8(14, argValue.codePointAt(8));//s
            wireArg.setUint8(15, argValue.codePointAt(9));//u
            wireArg.setUint8(16, argValue.codePointAt(10));//m

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(17);
            expect(arg).toBe(argValue);
        });

        it("unmarshalls an empty optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "s".codePointAt(0));
            wireArg.setUint32(2, 0);
            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(null);
        });

        //--Array Unmarshalling--//

        it("unmarshalls a non optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            const buffer = new ArrayBuffer(8);
            const argValue = new Uint32Array(buffer);
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const wireArg = new DataView(new ArrayBuffer(13));//1+4+8
            const byteArray = new Uint8Array(buffer);
            wireArg.offset = 0;
            wireArg.setUint8(0, "a".codePointAt(0));
            wireArg.setUint32(1, buffer.byteLength);
            wireArg.setUint8(5, byteArray[0]);
            wireArg.setUint8(6, byteArray[1]);
            wireArg.setUint8(7, byteArray[2]);
            wireArg.setUint8(8, byteArray[3]);
            wireArg.setUint8(9, byteArray[4]);
            wireArg.setUint8(10, byteArray[5]);
            wireArg.setUint8(11, byteArray[6]);
            wireArg.setUint8(12, byteArray[7]);

            //when
            const arg = new Uint32Array(connection._unmarshallArg(wireArg));

            //then
            expect(wireArg.offset).toBe(13);
            expect(arg[0]).toBe(argValue[0]);
            expect(arg[1]).toBe(argValue[1]);
        });

        it("unmarshalls a non empty optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            const buffer = new ArrayBuffer(8);
            const argValue = new Uint32Array(buffer);
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const wireArg = new DataView(new ArrayBuffer(14));//1+1+4+8
            const byteArray = new Uint8Array(buffer);
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "a".codePointAt(0));
            wireArg.setUint32(2, buffer.byteLength);
            wireArg.setUint8(6, byteArray[0]);
            wireArg.setUint8(7, byteArray[1]);
            wireArg.setUint8(8, byteArray[2]);
            wireArg.setUint8(9, byteArray[3]);
            wireArg.setUint8(10, byteArray[4]);
            wireArg.setUint8(11, byteArray[5]);
            wireArg.setUint8(12, byteArray[6]);
            wireArg.setUint8(13, byteArray[7]);

            //when
            const arg = new Uint32Array(connection._unmarshallArg(wireArg));

            //then
            expect(wireArg.offset).toBe(14);
            expect(arg[0]).toBe(argValue[0]);
            expect(arg[1]).toBe(argValue[1]);
        });

        it("unmarshalls an empty optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");

            const wireArg = new DataView(new ArrayBuffer(6));//1+1+4
            wireArg.offset = 0;
            wireArg.setUint8(0, "?".codePointAt(0));
            wireArg.setUint8(1, "a".codePointAt(0));
            wireArg.setUint32(2, 0);

            //when
            const arg = connection._unmarshallArg(wireArg);

            //then
            expect(wireArg.offset).toBe(6);
            expect(arg).toBe(null);
        });
    });

    describe("method call marshalling", function () {
        it("marshalls method call with all possible argument types", function () {
            //given

            global.WebSocket = function (url, protocol) {
            };//mock WebSocket

            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");
            connection._socket.send = jasmine.createSpy('mock send');

            const objectid = 123;
            const opcode = 255;
            const uintArg = 987;
            const intArg = -789;
            const fixedArg = wf.parseFixed(0.123);
            const doubleArg = 0.123456;
            const objectArg = new wf.WObject(connection, {name: "objectItf"});
            objectArg._id = 321;

            const newObjectItfName = "newObjectItf";
            wf[newObjectItfName] = class newObjectItf extends wf.WObject {
                constructor(connection) {
                    super(connection, {name: newObjectItfName});
                }
            };

            const stringArg = "lorum ipsum";
            const bufferLength = 8;
            const buffer = new ArrayBuffer(bufferLength);
            const arrayArg = new Uint32Array(buffer);
            arrayArg[0] = 0xF1234567;
            arrayArg[1] = 0x1234567F;

            //when
            const newObject = wf._newObject();
            connection._marshallConstructor(objectid, opcode, newObjectItfName,
                [
                    wf._uint(uintArg),
                    wf._int(intArg),
                    wf._fixed(fixedArg),
                    wf._object(objectArg),
                    newObject,
                    wf._string(stringArg),
                    wf._array(arrayArg)
                ]);

            //then
            const wireMsgBuffer = new ArrayBuffer(4 + 1 + 1 + 4 + 1 + 4 + 1 + 4 + 1 + 4 + 1 + 4 + 1 + newObjectItfName.length + 1 + 4 + stringArg.length + 1 + 4 + buffer.byteLength);
            const wireDataView = new DataView(wireMsgBuffer);
            let offset = 0;
            wireDataView.setUint32(offset, objectid);
            offset += 4;
            wireDataView.setUint8(offset, opcode);
            offset += 1;
            wireDataView.setUint8(offset, "u".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, uintArg);
            offset += 4;
            wireDataView.setUint8(offset, "i".codePointAt(0));
            offset += 1;
            wireDataView.setInt32(offset, intArg);
            offset += 4;
            wireDataView.setUint8(offset, "f".codePointAt(0));
            offset += 1;
            wireDataView.setInt32(offset, fixedArg._raw);
            offset += 4;
            wireDataView.setUint8(offset, "o".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, objectArg._id);
            offset += 4;
            wireDataView.setUint8(offset, "n".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, newObject.value._id);
            offset += 4;
            wireDataView.setUint8(offset, newObjectItfName.length);
            offset += 1;
            for (let i = 0, len = newObjectItfName.length; i < len; i++) {
                wireDataView.setUint8(offset, newObjectItfName[i].codePointAt(0));
                offset += 1;
            }
            wireDataView.setUint8(offset, "s".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, stringArg.length);
            offset += 4;
            for (let i = 0, len = stringArg.length; i < len; i++) {
                wireDataView.setUint8(offset, stringArg[i].codePointAt(0));
                offset += 1;
            }
            wireDataView.setUint8(offset, "a".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, bufferLength);
            offset += 4;
            let bufferBlob = new Uint8Array(buffer);
            for (let i = 0; i < bufferLength; i++) {
                wireDataView.setUint8(offset, bufferBlob[i]);
                offset += 1;
            }

            expect(connection._socket.send).toHaveBeenCalled();
            expect(connection._socket.send.calls.mostRecent().args[0]).toBeBlobEqual(wireMsgBuffer);
        });
    });

    describe("method call unmarshalling", function () {
        it("unmarshalls method call with all possible argument types", function () {
            //given
            global.WebSocket = function (url, protocol) {
            };//mock WebSocket

            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.WConnection("dummyURL");

            const objectid = 123;
            const opcode = 255;
            const uintArg = 987;
            const intArg = -789;
            const fixedArg = wf.parseFixed(0.123);
            const doubleArg = 0.1234567;
            const objectArgId = 321;
            const newObjectItfName = "newObjectItf";
            const newObjectArgId = 654;
            const stringArg = "lorum ipsum";
            const bufferLength = 8;
            const buffer = new ArrayBuffer(bufferLength);
            const arrayArg = new Uint32Array(buffer);
            arrayArg[0] = 0xF1234567;
            arrayArg[1] = 0x1234567F;

            const targetObject = new wf.WObject(connection, {
                name: "dummyObject"
            });
            targetObject[opcode] = jasmine.createSpy('mock object function');
            targetObject._id = objectid;
            connection._objects.set(objectid, targetObject);

            const objectArg = new wf.WObject(connection, {name: "objectItf"});
            objectArg._id = objectArgId;
            connection._objects.set(objectArgId, objectArg);

            wf.newObjectItf = class newObjectItf extends wf.WObject {
                constructor(connection) {
                    super(connection, {
                        name: "newObjectItf"
                    });
                }
            };

            const wireMsgBuffer = new ArrayBuffer(
                4 + //object id
                1 + //opcode
                1 + 4 + //unsigned integer
                1 + 4 + //integer
                1 + 4 + //fixed
                1 + 4 + //object
                1 + 4 + 1 + newObjectItfName.length + //new object
                1 + 4 + stringArg.length + //string
                1 + 4 + buffer.byteLength //array
            );
            const wireDataView = new DataView(wireMsgBuffer);
            let offset = 0;
            wireDataView.setUint32(offset, objectid);
            offset += 4;
            wireDataView.setUint8(offset, opcode);
            offset += 1;
            wireDataView.setUint8(offset, "u".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, uintArg);
            offset += 4;
            wireDataView.setUint8(offset, "i".codePointAt(0));
            offset += 1;
            wireDataView.setInt32(offset, intArg);
            offset += 4;
            wireDataView.setUint8(offset, "f".codePointAt(0));
            offset += 1;
            wireDataView.setInt32(offset, fixedArg._raw);
            offset += 4;
            wireDataView.setUint8(offset, "o".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, objectArgId);
            offset += 4;
            wireDataView.setUint8(offset, "n".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, newObjectArgId);
            offset += 4;
            wireDataView.setUint8(offset, newObjectItfName.length);
            offset += 1;
            for (let i = 0, len = newObjectItfName.length; i < len; i++) {
                wireDataView.setUint8(offset, newObjectItfName[i].codePointAt(0));
                offset += 1;
            }
            wireDataView.setUint8(offset, "s".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, stringArg.length);
            offset += 4;
            for (let i = 0, len = stringArg.length; i < len; i++) {
                wireDataView.setUint8(offset, stringArg[i].codePointAt(0));
                offset += 1;
            }
            wireDataView.setUint8(offset, "a".codePointAt(0));
            offset += 1;
            wireDataView.setUint32(offset, bufferLength);
            offset += 4;
            let bufferBlob = new Uint8Array(buffer);
            for (let i = 0; i < bufferLength; i++) {
                wireDataView.setUint8(offset, bufferBlob[i]);
                offset += 1;
            }

            //when
            connection._onSocketMessage(wireMsgBuffer);

            //then
            expect(targetObject[opcode]).toHaveBeenCalled();
            expect(targetObject[opcode].calls.mostRecent().args[0]).toEqual(uintArg);
            expect(targetObject[opcode].calls.mostRecent().args[1]).toEqual(intArg);
            expect(targetObject[opcode].calls.mostRecent().args[2]).toEqual(fixedArg);
            expect(targetObject[opcode].calls.mostRecent().args[3]).toEqual(objectArg);
            expect(targetObject[opcode].calls.mostRecent().args[4]._id).toEqual(newObjectArgId);
            expect(targetObject[opcode].calls.mostRecent().args[4].iface.name).toEqual(newObjectItfName);
            expect(targetObject[opcode].calls.mostRecent().args[5]).toEqual(stringArg);
            expect(targetObject[opcode].calls.mostRecent().args[6]).toBeBlobEqual(buffer);
        });
    });
});
