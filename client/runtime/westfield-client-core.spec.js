const wf = require('./westfield-client-core.js');

describe("westfield-client-core", function () {

    const customMatchers = {
        toBeBlobEqual: function (util, customEqualityTesters) {
            return {
                compare: function (buf1, buf2) {
                    return {
                        pass: (function () {
                            if (buf1.byteLength !== buf2.byteLength) {
                                return false;
                            }

                            const dv1 = new Uint8Array(buf1);
                            const dv2 = new Uint8Array(buf2);

                            for (let i = 0; i < buf1.byteLength; i++) {
                                if (dv1[i] !== dv2[i]) {
                                    //console.error("buf1[" + i + "] === " + dv1[i] + " != buf2[" + i + "] === " + dv2[i] + "\n");
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
        //         if (i !== fixed.asDouble()) {
        //             expect(fixed.asDouble()).toBe(i);
        //             break;
        //         }
        //     }
        // });
        //
        // it("converts back and forth using the negative range of a 24-bit number and an 8-bit fraction", function () {
        //     for (let i = 0; i < 0x00800000; i += 0.00390625) {
        //         const fixed = new wf.parseFixed(-i);
        //         if (-i !== fixed.asDouble()) {
        //             expect(fixed.asDouble()).toBe(-i);
        //             break;
        //         }
        //     }
        // });
    });

    describe("argument marshalling", function () {

        //--Unsigned integer marshalling --//
        it("marshalls a number to a non optional 32bit unsgined integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = 0x87654321;
            const arg = wf._uint(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue);
        });

        it("marshalls a number to an optional 32bit unsigned integer", function () {
            //given
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = 0x87654321;
            const arg = wf._uintOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue);
        });

        it("marshalls a null number to an optional 32bit unsigned integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = null;
            const arg = wf._uintOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(0);
        });

        //--Integer marshalling --//

        it("marshalls a number to a non optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = -123456789;
            const arg = wf._int(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Int32Array(wireMsg, 4)[0]).toBe(argValue);
        });

        it("marshalls a number to an optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = -123456789;
            const arg = wf._intOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Int32Array(wireMsg, 4)[0]).toBe(argValue);
        });

        it("marshalls a null number to an optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = null;
            const arg = wf._int(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Int32Array(wireMsg, 4)[0]).toBe(0);
        });

        //--Fixed marshalling--//

        it("marshalls a number to a non optional fixed", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = 1234.567;
            const arg = wf._fixed(wf.parseFixed(argValue));

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new wf.Fixed(new Int32Array(wireMsg, 4)[0]).asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("marshalls a number to an optional 32bit fixed", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = 1234.567;
            const arg = wf._fixedOptional(wf.parseFixed(argValue));

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new wf.Fixed(new Int32Array(wireMsg, 4)[0]).asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("marshalls a null number to an optional 32bit fixed", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = null;
            const arg = wf._fixedOptional(wf.parseFixed(argValue));

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new wf.Fixed(new Int32Array(wireMsg, 4)[0]).asDouble()).toBe(0);
        });

        //--Object marshalling--//

        it("marshalls a westfield object to a non optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const objectId = 0xfffe1234;
            const argValue = {_id: objectId};
            const arg = wf._object(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(objectId);
        });

        it("marshalls a westfield object to a an optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const objectId = 0xfffe1234;
            const argValue = {_id: objectId};
            const arg = wf._objectOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(objectId);
        });

        it("marshalls a null westfield object to an optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const argValue = null;
            const arg = wf._objectOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(0);
        });

        //--New object marshalling--//

        it("marshalls a new westfield object to a non optional 32bit integer", function () {
            //given
            const wireMsg = new ArrayBuffer(8);
            wireMsg.offset = 4;
            const objectId = 0xfffe1234;
            const argValue = {_id: objectId};
            const arg = wf._newObject();
            arg.value = argValue;

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(objectId);
        });

        //--String marshalling--//

        it("marshalls a string to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(20);
            wireMsg.offset = 4;
            const argValue = "lorem ipsum";
            const arg = wf._string(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(20);//4+4+11+1
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue.length);
            const buf8 = new Uint8Array(wireMsg, 8);
            expect(buf8[0]).toBe(argValue[0].codePointAt(0));//l
            expect(buf8[1]).toBe(argValue[1].codePointAt(0));//o
            expect(buf8[2]).toBe(argValue[2].codePointAt(0));//r
            expect(buf8[3]).toBe(argValue[3].codePointAt(0));//e
            expect(buf8[4]).toBe(argValue[4].codePointAt(0));//m
            expect(buf8[5]).toBe(argValue[5].codePointAt(0));//
            expect(buf8[6]).toBe(argValue[6].codePointAt(0));//i
            expect(buf8[7]).toBe(argValue[7].codePointAt(0));//p
            expect(buf8[8]).toBe(argValue[8].codePointAt(0));//s
            expect(buf8[9]).toBe(argValue[9].codePointAt(0));//u
            expect(buf8[10]).toBe(argValue[10].codePointAt(0));//m
        });

        it("marshalls an optional string to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(20);
            wireMsg.offset = 4;
            const argValue = "lorem ipsum";
            const arg = wf._stringOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(20);//4+4+11+1
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue.length);
            const buf8 = new Uint8Array(wireMsg, 8);
            expect(buf8[0]).toBe(argValue[0].codePointAt(0));//l
            expect(buf8[1]).toBe(argValue[1].codePointAt(0));//o
            expect(buf8[2]).toBe(argValue[2].codePointAt(0));//r
            expect(buf8[3]).toBe(argValue[3].codePointAt(0));//e
            expect(buf8[4]).toBe(argValue[4].codePointAt(0));//m
            expect(buf8[5]).toBe(argValue[5].codePointAt(0));//
            expect(buf8[6]).toBe(argValue[6].codePointAt(0));//i
            expect(buf8[7]).toBe(argValue[7].codePointAt(0));//p
            expect(buf8[8]).toBe(argValue[8].codePointAt(0));//s
            expect(buf8[9]).toBe(argValue[9].codePointAt(0));//u
            expect(buf8[10]).toBe(argValue[10].codePointAt(0));//m
        });

        it("marshalls an optional null string to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(20);
            wireMsg.offset = 4;
            const argValue = null;
            const arg = wf._stringOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);//4+4
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(0);
        });

        //--Array marshalling--//

        it("marshalls a typed array to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(16);
            wireMsg.offset = 4;
            const argValue = new Uint32Array(new ArrayBuffer(8));
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const arg = wf._array(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(16);//4+4+8
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue.buffer.byteLength);
            let intArray = new Uint32Array(wireMsg.slice(8, 16), 0, 2);
            expect(intArray[0]).toBe(0xF1234567);//0xF1234567
            expect(intArray[1]).toBe(0x1234567F);//0x1234567F
        });

        it("marshalls an optional typed array to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(16);
            wireMsg.offset = 4;
            const argValue = new Uint32Array(new ArrayBuffer(8));
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            const arg = wf._arrayOptional(argValue);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(16);//4+4+8
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(argValue.buffer.byteLength);
            let intArray = new Uint32Array(wireMsg.slice(8, 16), 0, 2);
            expect(intArray[0]).toBe(0xF1234567);//0xF1234567
            expect(intArray[1]).toBe(0x1234567F);//0x1234567F
        });

        it("marshalls an optional null typed array to an array of 8bit unsigned integers", function () {
            //given
            const wireMsg = new ArrayBuffer(16);
            wireMsg.offset = 4;

            const arg = wf._arrayOptional(null);

            //when
            arg._marshallArg(wireMsg);

            //then
            expect(wireMsg.offset).toBe(8);//4+4
            expect(new Uint32Array(wireMsg, 4)[0]).toBe(0);
        });
    });


    describe("argument unmarshalling", function () {

        //--Unsigned Integer Unmarshalling--//

        it("unmarshalls a non optional 32bit unsigned integer to a number", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 6553699;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "u");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls a non null optional 32bit unsigned integer to a number", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 6553699;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?u");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls a zero optional 32bit unsigned integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?u");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        //--Integer Unmarshalling--//

        it("unmarshalls a non optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = -6553699;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "i");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls a non null optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = -6553699;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?i");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls a zero optional 32bit integer to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?i");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(argValue);
        });

        //--Fixed Unmarshalling--//

        it("unmarshalls a non optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 1234.567;
            const buf32 = new Int32Array(wireMsg);
            buf32[0] = wf.parseFixed(argValue)._raw;

            //when
            const args = connection._unmarshallArgs(wireMsg, "f");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0].asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("unmarshalls a non zero optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 1234.567;
            const buf32 = new Int32Array(wireMsg);
            buf32[0] = wf.parseFixed(argValue)._raw;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?f");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0].asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        it("unmarshalls a zero optional fixed to a number, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry
            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const argValue = 0;
            const buf32 = new Int32Array(wireMsg);
            buf32[0] = wf.parseFixed(argValue)._raw;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?f");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0].asDouble().toFixed(2)).toBe(argValue.toFixed(2));
        });

        //--Object Unmarshalling--//

        it("unmarshalls a non optional 32bit integer to an object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            connection._objects.set(objectId, {_id: objectId});

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = objectId;

            //when
            const args = connection._unmarshallArgs(wireMsg, "o");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]._id).toBe(objectId);
        });

        it("unmarshalls a non zero optional 32bit integer to an object, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            connection._objects.set(objectId, {_id: objectId});

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = objectId;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?o");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]._id).toBe(objectId);
        });

        it("unmarshalls a zero optional 32bit integer to an object", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = 0;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?o");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(null);
        });

        //--New object Unmarshalling--//

        it("unmarshalls a 32bit integer to a new object", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");
            connection._objects = new Map();
            const objectId = 1234567;
            const objectType = "Dummy";
            wf.Dummy = function () {
            };

            const wireMsg = new ArrayBuffer(4);
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = objectId;

            //when
            const args = connection._unmarshallArgs(wireMsg, "n");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0](objectType)._id).toBe(objectId);
        });

        //--String Unmarshalling--//

        it("unmarshalls a non optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const argValue = "lorem ipsum";
            const wireMsg = new ArrayBuffer(16);//4+12
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue.length;
            const buf8 = new Uint8Array(wireMsg);
            buf8[4] = argValue.codePointAt(0); //l
            buf8[5] = argValue.codePointAt(1); //o
            buf8[6] = argValue.codePointAt(2); //r
            buf8[7] = argValue.codePointAt(3); //u
            buf8[8] = argValue.codePointAt(4); //m
            buf8[9] = argValue.codePointAt(5); //
            buf8[10] = argValue.codePointAt(6); //i
            buf8[11] = argValue.codePointAt(7); //p
            buf8[12] = argValue.codePointAt(8); //s
            buf8[13] = argValue.codePointAt(9); //u
            buf8[14] = argValue.codePointAt(10); //m

            //when
            const args = connection._unmarshallArgs(wireMsg, "s");

            //then
            expect(wireMsg.offset).toBe(16);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls a non empty optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const argValue = "lorem ipsum";
            const wireMsg = new ArrayBuffer(16);//4+12
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = argValue.length;
            const buf8 = new Uint8Array(wireMsg);
            buf8[4] = argValue.codePointAt(0); //l
            buf8[5] = argValue.codePointAt(1); //o
            buf8[6] = argValue.codePointAt(2); //r
            buf8[7] = argValue.codePointAt(3); //u
            buf8[8] = argValue.codePointAt(4); //m
            buf8[9] = argValue.codePointAt(5); //
            buf8[10] = argValue.codePointAt(6); //i
            buf8[11] = argValue.codePointAt(7); //p
            buf8[12] = argValue.codePointAt(8); //s
            buf8[13] = argValue.codePointAt(9); //u
            buf8[14] = argValue.codePointAt(10); //m

            //when
            const args = connection._unmarshallArgs(wireMsg, "?s");

            //then
            expect(wireMsg.offset).toBe(16);
            expect(args[0]).toBe(argValue);
        });

        it("unmarshalls an empty optional string to a string, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const argValue = "lorem ipsum";
            const wireMsg = new ArrayBuffer(16);//4
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = 0;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?s");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(null);
        });

        //--Array Unmarshalling--//

        it("unmarshalls a non optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(16);//4+12
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);

            const buffer = new ArrayBuffer(8);
            const argValue = new Uint32Array(buffer);
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            buf32[0] = buffer.byteLength;

            const buf8 = new Uint8Array(wireMsg);
            const byteArray = new Uint8Array(buffer);

            buf8[4] = byteArray[0];
            buf8[5] = byteArray[1];
            buf8[6] = byteArray[2];
            buf8[7] = byteArray[3];
            buf8[8] = byteArray[4];
            buf8[9] = byteArray[5];
            buf8[10] = byteArray[6];
            buf8[11] = byteArray[7];

            //when
            const args = connection._unmarshallArgs(wireMsg, "a");

            //then
            expect(wireMsg.offset).toBe(16);
            const arr = new Uint32Array(args[0]);
            expect(arr[0]).toBe(argValue[0]);
            expect(arr[1]).toBe(argValue[1]);
        });

        it("unmarshalls a non empty optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(16);//4+12
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);

            const buffer = new ArrayBuffer(8);
            const argValue = new Uint32Array(buffer);
            argValue[0] = 0xF1234567;
            argValue[1] = 0x1234567F;

            buf32[0] = buffer.byteLength;

            const buf8 = new Uint8Array(wireMsg);
            const byteArray = new Uint8Array(buffer);

            buf8[4] = byteArray[0];
            buf8[5] = byteArray[1];
            buf8[6] = byteArray[2];
            buf8[7] = byteArray[3];
            buf8[8] = byteArray[4];
            buf8[9] = byteArray[5];
            buf8[10] = byteArray[6];
            buf8[11] = byteArray[7];

            //when
            const args = connection._unmarshallArgs(wireMsg, "?a");

            //then
            expect(wireMsg.offset).toBe(16);
            const arr = new Uint32Array(args[0]);
            expect(arr[0]).toBe(argValue[0]);
            expect(arr[1]).toBe(argValue[1]);
        });

        it("unmarshalls an empty optional array to an array, using the data view wire argument", function () {
            //given
            global.WebSocket = function () {
            };//mock WebSocket
            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");

            const wireMsg = new ArrayBuffer(16);//4+12
            wireMsg.offset = 0;
            const buf32 = new Uint32Array(wireMsg);
            buf32[0] = 0;

            //when
            const args = connection._unmarshallArgs(wireMsg, "?a");

            //then
            expect(wireMsg.offset).toBe(4);
            expect(args[0]).toBe(null);
        });
    });

    describe("method call marshalling", function () {
        it("marshalls method call with all possible argument types", function () {
            //given

            global.WebSocket = function (url, protocol) {
            };//mock WebSocket

            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");
            connection._socket.send = jasmine.createSpy('mock send');

            const objectid = 123;
            const opcode = 255;
            const uintArg = 987;
            const intArg = -789;
            const fixedArg = wf.parseFixed(0.123);
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
            const wireMsg = new ArrayBuffer(
                4 + //objectid 4
                2 + //size 6
                2 + //opcode 8
                4 + //uint 12
                4 + //int 16
                4 + //fixed 20
                4 + //object id 24
                4 + //new object id 28
                4 + //str length 32
                ((stringArg.length + 3) & ~3) + //str 44
                4 + //array length 48
                ((buffer.byteLength + 3) & ~3) //array 56
            );

            const bufu32 = new Uint32Array(wireMsg);
            const bufu16 = new Uint16Array(wireMsg);
            const buf32 = new Int32Array(wireMsg);
            const bufu8 = new Uint8Array(wireMsg);

            bufu32[0] = objectid;
            bufu16[2] = wireMsg.byteLength;
            bufu16[3] = opcode;
            bufu32[2] = uintArg;
            buf32[3] = intArg;
            buf32[4] = fixedArg._raw;
            bufu32[5] = objectArg._id;
            bufu32[6] = newObject.value._id;
            bufu32[7] = stringArg.length;
            for (let i = 0, len = stringArg.length; i < len; i++) {
                bufu8[(8 * 4) + i] = stringArg[i].codePointAt(0);
            }

            let offset = 8 + ((stringArg.length + 3) & ~3) / 4;
            bufu32[offset] = bufferLength;
            offset++;

            const bufferBlob = new Uint8Array(buffer);
            for (let i = 0; i < bufferLength; i++) {
                bufu8[(offset * 4) + i] = bufferBlob[i];
            }

            expect(connection._socket.send).toHaveBeenCalled();
            expect(connection._socket.send.calls.mostRecent().args[0]).toBeBlobEqual(wireMsg);
        });
    });

    describe("method call unmarshalling", function () {
        it("unmarshalls method call with all possible argument types", function () {
            //given
            global.WebSocket = function (url, protocol) {
            };//mock WebSocket

            wf.Registry = function () {
            };//mock Registry

            const connection = new wf.Connection("dummyURL");
            connection._objects = new Map();

            const objectid = 123;
            const opcode = 255;
            const uintArg = 987;
            const intArg = -789;
            const fixedArg = wf.parseFixed(0.123);
            const objectArg = new wf.WObject(connection, {name: "objectItf"});
            objectArg._id = 321;
            connection._objects.set(objectArg._id, objectArg);
            const newObjectId = 643;

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

            const targetObject = new wf.WObject(connection, {
                name: "dummyObject",
                mock: jasmine.createSpy('mock object function')
            });
            targetObject[opcode] = function (wireMsg) {
                const args = this.connection._unmarshallArgs(wireMsg, "uifonsa");
                this.listener.mock.call(
                    this.listener,
                    args[0], //u
                    args[1], //i
                    args[2], //f
                    args[3], //o
                    args[4](newObjectItfName),//n
                    args[5], //s
                    args[6] //a
                );
            };
            targetObject._id = objectid;
            connection._objects.set(objectid, targetObject);

            const wireMsg = new ArrayBuffer(
                4 + //objectid 4
                2 + //size 6
                2 + //opcode 8
                4 + //uint 12
                4 + //int 16
                4 + //fixed 20
                4 + //object id 24
                4 + //new object id 28
                4 + //str length 32
                ((stringArg.length + 3) & ~3) + //str 44
                4 + //array length 48
                ((buffer.byteLength + 3) & ~3) //array 56
            );

            const bufu32 = new Uint32Array(wireMsg);
            const bufu16 = new Uint16Array(wireMsg);
            const buf32 = new Int32Array(wireMsg);
            const bufu8 = new Uint8Array(wireMsg);

            bufu32[0] = objectid;
            bufu16[2] = wireMsg.byteLength;
            bufu16[3] = opcode;
            bufu32[2] = uintArg;
            buf32[3] = intArg;
            buf32[4] = fixedArg._raw;
            bufu32[5] = objectArg._id;
            bufu32[6] = newObjectId;
            bufu32[7] = stringArg.length;
            for (let i = 0, len = stringArg.length; i < len; i++) {
                bufu8[(8 * 4) + i] = stringArg[i].codePointAt(0);
            }

            let offset = 8 + ((stringArg.length + 3) & ~3) / 4;
            bufu32[offset] = bufferLength;
            offset++;

            const bufferBlob = new Uint8Array(buffer);
            for (let i = 0; i < bufferLength; i++) {
                bufu8[(offset * 4) + i] = bufferBlob[i];
            }

            //when
            connection._onSocketMessage({data: wireMsg});

            //then
            expect(targetObject.listener.mock).toHaveBeenCalled();
            expect(targetObject.listener.mock.calls.mostRecent().args[0]).toEqual(uintArg);
            expect(targetObject.listener.mock.calls.mostRecent().args[1]).toEqual(intArg);
            expect(targetObject.listener.mock.calls.mostRecent().args[2]).toEqual(fixedArg);
            expect(targetObject.listener.mock.calls.mostRecent().args[3]).toEqual(objectArg);
            expect(targetObject.listener.mock.calls.mostRecent().args[4]._id).toEqual(newObjectId);
            expect(targetObject.listener.mock.calls.mostRecent().args[4].listener.name).toEqual(newObjectItfName);
            expect(targetObject.listener.mock.calls.mostRecent().args[5]).toEqual(stringArg);
            expect(targetObject.listener.mock.calls.mostRecent().args[6]).toBeBlobEqual(buffer);
        });
    });
});
