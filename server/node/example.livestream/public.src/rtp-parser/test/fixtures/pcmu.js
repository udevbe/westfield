'use strict';

exports.packet = new Buffer(
	'80802fc0019e81841736bd54fffefefefe7e7e7e7d7effff7e7e7e7e7efefeff' +
	'ff7e7eff7e7eff7dfffeff7e7e7efffefeff7e7e7e7eff7effff7e7e7efeffff' +
	'feffff7eff7e7e7e7e7eff7efffeffffff7e7e7eff7efffe7e7e7eff7e7efe7e' +
	'fffe7e7e7e7efffeff7effff7e7effff7e7d7e7e7efefefefe7e7e7e7eff7e7e' +
	'7e7e7e7e7eff7e7effff7e7effffffff7eff7effff7efffefefffffeff7e7e7e' +
	'7e7e7e7efefeff7e7d7e7e7efe7e7e7e7d7efffefffefffefeff7e7efffefe7e' +
	'7e7e7efeff7eff7e7eff7efefefe7e7d7e7e7e7e7effff7eff7effff7dffffff' +
	'ffff7e7eff7e7efffffefeff7eff7e7e7eff7eff7e7e7e7d7efeffff', 'hex'
);

exports.parsed = {
	version: 2,
	padding: 0,
	extension: 0,
	csrcCount: 0,
	marker: 1,
	payloadType: 0,
	sequenceNumber: 12224,
	timestamp: 27165060,
	ssrc: 0x1736bd54,
	csrc: [],
	payload: new Buffer(
		'fffefefefe7e7e7e7d7effff7e7e7e7e7efefeffff7e7eff7e7eff7dfffeff7e' +
		'7e7efffefeff7e7e7e7eff7effff7e7e7efefffffeffff7eff7e7e7e7e7eff7e' +
		'fffeffffff7e7e7eff7efffe7e7e7eff7e7efe7efffe7e7e7e7efffeff7effff' +
		'7e7effff7e7d7e7e7efefefefe7e7e7e7eff7e7e7e7e7e7e7eff7e7effff7e7e' +
		'ffffffff7eff7effff7efffefefffffeff7e7e7e7e7e7e7efefeff7e7d7e7e7e' +
		'fe7e7e7e7d7efffefffefffefeff7e7efffefe7e7e7e7efeff7eff7e7eff7efe' +
		'fefe7e7d7e7e7e7e7effff7eff7effff7dffffffffff7e7eff7e7efffffefeff' +
		'7eff7e7e7eff7eff7e7e7e7d7efeffff', 'hex'
	)
};
