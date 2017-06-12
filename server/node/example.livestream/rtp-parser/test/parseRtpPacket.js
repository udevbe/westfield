'use strict';

var expect = require('expect.js'),
	parseRtpPacket = require('../index').parseRtpPacket;

describe('parser test', function() {
	it('should throw error on non-buffer', function() {
		expect(function() {
			parseRtpPacket('i am not buffer');
		}).to.throwException(/buffer required/);
	});

	it('should throw error on buffer smaller than fixed header', function() {
		expect(function() {
			parseRtpPacket(new Buffer('deadbeef', 'hex'));
		}).to.throwException(/can not parse buffer smaller than fixed header/);
	});
});
