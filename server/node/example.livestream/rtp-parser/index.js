'use strict';

var FIXED_HEADER_LENGTH = 12;

exports.FIXED_HEADER_LENGTH = FIXED_HEADER_LENGTH;

exports.parseRtpPacket = function parseRtpPacket(buf) {
	if (!Buffer.isBuffer(buf)) {
		throw new Error('buffer required');
	}

	if (buf.length < FIXED_HEADER_LENGTH) {
		throw new Error('can not parse buffer smaller than fixed header');
	}

	var firstByte = buf.readUInt8(0),
		secondByte = buf.readUInt8(1);

	var parsed = {
		version: firstByte >> 6,
		padding: (firstByte >> 5) & 1,
		extension: (firstByte >> 4) & 1,
		csrcCount: firstByte & 0x0f,
		marker: secondByte >> 7,
		payloadType: secondByte & 0x7f,
		sequenceNumber: buf.readUInt16BE(2),
		timestamp: buf.readUInt32BE(4),
		ssrc: buf.readUInt32BE(8),
		csrc: []
	};

	for (var i = 0; i < parsed.csrcCount; i++) {
		parsed.csrc.push(buf.readUInt32BE(9 + 4 * i));
	}

	parsed.payload = buf.slice(FIXED_HEADER_LENGTH + 4 * parsed.csrcCount);

	return parsed;
};

var payloadTypesHash = {
	0: {name: 'PCMU', mediaType: 'A', clockRate: 8000, channels: 1},
	1: {name: 'reserved', mediaType: 'A'},
	2: {name: 'reserved', mediaType: 'A'},
	3: {name: 'GSM' , mediaType: 'A', clockRate: 8000, channels: 1},
	4: {name: 'G723', mediaType: 'A', clockRate: 8000, channels: 1},
	5: {name: 'DVI4', mediaType: 'A', clockRate: 8000, channels: 1},
	6: {name: 'DVI4', mediaType: 'A', clockRate: 16000, channels: 1},
	7: {name: 'LPC', mediaType: 'A', clockRate: 8000, channels: 1},
	8: {name: 'PCMA', mediaType: 'A', clockRate: 8000, channels: 1},
	9: {name: 'G722', mediaType: 'A', clockRate: 8000, channels: 1},
	10: {name: 'L16', mediaType: 'A', clockRate: 44100, channels: 2},
	11: {name: 'L16', mediaType: 'A', clockRate: 44100, channels: 1},
	12: {name: 'QCELP', mediaType: 'A', clockRate: 8000, channels: 1},
	13: {name: 'CN', mediaType: 'A', clockRate: 8000, channels: 1},
	14: {name: 'MPA', mediaType: 'A', clockRate: 90000},
	15: {name: 'G728', mediaType: 'A', clockRate: 8000, channels: 1},
	16: {name: 'DVI4', mediaType: 'A', clockRate: 11025, channels: 1},
	17: {name: 'DVI4', mediaType: 'A', clockRate: 22050, channels: 1},
	18: {name: 'G729', mediaType: 'A', clockRate: 8000, channels: 1},
	19: {name: 'reserved', mediaType: 'A'},
	20: {name: 'unassigned', mediaType: 'A'},
	21: {name: 'unassigned', mediaType: 'A'},
	22: {name: 'unassigned', mediaType: 'A'},
	23: {name: 'unassigned', mediaType: 'A'},
	24: {name: 'unassigned', mediaType: 'V'},
	25: {name: 'CelB', mediaType: 'V', clockRate: 90000},
	26: {name: 'JPEG', mediaType: 'V', clockRate: 90000},
	27: {name: 'unassigned', mediaType: 'V'},
	28: {name: 'nv', mediaType: 'V', clockRate: 90000},
	29: {name: 'unassigned', mediaType: 'V'},
	30: {name: 'unassigned', mediaType: 'V'},
	31: {name: 'H261', mediaType: 'V', clockRate: 90000},
	32: {name: 'MPV', mediaType: 'V', clockRate: 90000},
	33: {name: 'MP2T', mediaType: 'AV', clockRate: 90000},
	34: {name: 'H263', mediaType: 'V', clockRate: 90000},
	35: {name: 'unassigned'},
	36: {name: 'unassigned'},
	37: {name: 'unassigned'},
	38: {name: 'unassigned'},
	39: {name: 'unassigned'},
	40: {name: 'unassigned'},
	41: {name: 'unassigned'},
	42: {name: 'unassigned'},
	43: {name: 'unassigned'},
	44: {name: 'unassigned'},
	45: {name: 'unassigned'},
	46: {name: 'unassigned'},
	47: {name: 'unassigned'},
	48: {name: 'unassigned'},
	49: {name: 'unassigned'},
	50: {name: 'unassigned'},
	51: {name: 'unassigned'},
	52: {name: 'unassigned'},
	53: {name: 'unassigned'},
	54: {name: 'unassigned'},
	55: {name: 'unassigned'},
	56: {name: 'unassigned'},
	57: {name: 'unassigned'},
	58: {name: 'unassigned'},
	59: {name: 'unassigned'},
	60: {name: 'unassigned'},
	61: {name: 'unassigned'},
	62: {name: 'unassigned'},
	63: {name: 'unassigned'},
	64: {name: 'unassigned'},
	65: {name: 'unassigned'},
	66: {name: 'unassigned'},
	67: {name: 'unassigned'},
	68: {name: 'unassigned'},
	69: {name: 'unassigned'},
	70: {name: 'unassigned'},
	71: {name: 'unassigned'},
	72: {name: 'reserved'},
	73: {name: 'reserved'},
	74: {name: 'reserved'},
	75: {name: 'reserved'},
	76: {name: 'reserved'},
	77: {name: 'unassigned'},
	78: {name: 'unassigned'},
	79: {name: 'unassigned'},
	80: {name: 'unassigned'},
	81: {name: 'unassigned'},
	82: {name: 'unassigned'},
	83: {name: 'unassigned'},
	84: {name: 'unassigned'},
	85: {name: 'unassigned'},
	86: {name: 'unassigned'},
	87: {name: 'unassigned'},
	88: {name: 'unassigned'},
	89: {name: 'unassigned'},
	90: {name: 'unassigned'},
	91: {name: 'unassigned'},
	92: {name: 'unassigned'},
	93: {name: 'unassigned'},
	94: {name: 'unassigned'},
	95: {name: 'unassigned'},
	96: {name: 'dynamic'},
	97: {name: 'dynamic'},
	98: {name: 'dynamic'},
	99: {name: 'dynamic'},
	100: {name: 'dynamic'},
	101: {name: 'dynamic'},
	102: {name: 'dynamic'},
	103: {name: 'dynamic'},
	104: {name: 'dynamic'},
	105: {name: 'dynamic'},
	106: {name: 'dynamic'},
	107: {name: 'dynamic'},
	108: {name: 'dynamic'},
	109: {name: 'dynamic'},
	110: {name: 'dynamic'},
	111: {name: 'dynamic'},
	112: {name: 'dynamic'},
	113: {name: 'dynamic'},
	114: {name: 'dynamic'},
	115: {name: 'dynamic'},
	116: {name: 'dynamic'},
	117: {name: 'dynamic'},
	118: {name: 'dynamic'},
	119: {name: 'dynamic'},
	120: {name: 'dynamic'},
	121: {name: 'dynamic'},
	122: {name: 'dynamic'},
	123: {name: 'dynamic'},
	124: {name: 'dynamic'},
	125: {name: 'dynamic'},
	126: {name: 'dynamic'},
	127: {name: 'dynamic'}
};

exports.payloadTypesHash = payloadTypesHash;

exports.parseRtpPayloadType = function parseRtpPayloadType(payloadType) {
	if (payloadType < 0 || payloadType > 127) {
		throw new Error('payload type range error');
	}

	return payloadTypesHash[payloadType];
};
