'use strict';

var _ = require('underscore'),
	expect = require('expect.js'),
	parseRtpPacket = require('../index').parseRtpPacket;

describe('packets test', function() {
	_(['h264', 'pcma', 'pcmu', 'dynamic']).each(function(name) {
		it('parse `' + name + '` packet', function() {
			var fixture = require('./fixtures/' + name),
				expected = fixture.parsed,
				parsed = parseRtpPacket(fixture.packet);

			expect(expected.version).to.equal(parsed.version);
			expect(expected.padding).to.equal(parsed.padding);
			expect(expected.extension).to.equal(parsed.extension);
			expect(expected.csrcCount).to.equal(parsed.csrcCount);
			expect(expected.marker).to.equal(parsed.marker);
			expect(expected.payloadType).to.equal(parsed.payloadType);
			expect(expected.sequenceNumber).to.equal(parsed.sequenceNumber);
			expect(expected.timestamp).to.equal(parsed.timestamp);
			expect(expected.ssrc).to.equal(parsed.ssrc);
			expect(expected.payload.toString('hex'))
				.to.equal(parsed.payload.toString('hex'));
		});
	});
});
