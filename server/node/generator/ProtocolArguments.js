'use strict'

class ProtocolArguments {
  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static uint (argName, optional) {
    return {
      signature: optional ? '?u' : 'u',
      jsType: optional ? '?number' : 'number',
      marshallGen: optional ? `uintOptional(${argName})` : `uint(${argName})`
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static int (argName, optional) {
    return {
      signature: optional ? '?i' : 'i',
      jsType: optional ? '?number' : 'number',
      marshallGen: optional ? `intOptional(${argName})` : `int(${argName})`
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static fixed (argName, optional) {
    return {
      signature: optional ? '?f' : 'f',
      jsType: optional ? '?Fixed' : 'Fixed',
      marshallGen: optional ? `fixedOptional(${argName})` : `fixed(${argName})`
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static object (argName, optional) {
    return {
      signature: optional ? '?o' : 'o',
      jsType: optional ? '?*' : '*',
      marshallGen: optional ? `objectOptional(${argName})` : `object(${argName})`
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static new_id (argName, optional) {
    return {
      signature: optional ? '?n' : 'n',
      jsType: '*',
      marshallGen: 'newObject()'
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static string (argName, optional) {
    return {
      signature: optional ? '?s' : 's',
      jsType: optional ? '?string' : 'string',
      marshallGen: optional ? `stringOptional(${argName})` : `string(${argName})`
    }
  }

  /**
   * @param {string}argName
   * @param {boolean}optional
   * @return {{signature: string, jsType: string, marshallGen: string}}
   */
  static array (argName, optional) {
    return {
      signature: optional ? '?a' : 'a',
      jsType: optional ? '?ArrayBuffer' : 'ArrayBuffer',
      marshallGen: optional ? `arrayOptional(${argName})` : `array(${argName})`
    }
  }
}

module.exports = ProtocolArguments