'use strict';

var _ = require('underscore'),
	expect = require('expect.js'),
	payloadTypesHash = require('../index').payloadTypesHash,
	parseRtpPayloadType = require('../index').parseRtpPayloadType;

var PAYLOAD_TYPES = 128;

describe('payload type test', function() {
	it('should have ' + PAYLOAD_TYPES + ' types', function() {
		expect(_(payloadTypesHash).keys()).to.have.length(PAYLOAD_TYPES);
		expect(payloadTypesHash).to.only.have.keys(
			_(PAYLOAD_TYPES).chain().range().map(String).value()
		);
	});

	it('should throw error on bad types', function() {
		var error = /payload type range error/;

		expect(function() {
			parseRtpPayloadType(-1);
		}).to.throwException(error);

		expect(function() {
			parseRtpPayloadType(128);
		}).to.throwException(error);
	});

	it('check random types', function() {
		expect(parseRtpPayloadType(26)).to.have.property('name', 'JPEG');
		expect(parseRtpPayloadType(8)).to.have.property('name', 'PCMA');
		expect(parseRtpPayloadType(0)).to.have.property('name', 'PCMU');
	});
});
