'use strict'

class Fixed {
  /**
   * Represent fixed as a signed 24-bit integer.
   *
   * @returns {number}
   */
  asInt () {
    return ((this._raw / 256.0) >> 0)
  }

  /**
   * Represent fixed as a signed 24-bit number with an 8-bit fractional part.
   *
   * @returns {number}
   */
  asDouble () {
    return this._raw / 256.0
  }

  /**
   * use parseFixed instead
   * @param {number}raw
   */
  constructor (raw) {
    this._raw = raw
  }
}

module.exports = Fixed