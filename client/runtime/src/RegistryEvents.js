/*
MIT License

Copyright (c) 2017 Erik De Rijcke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use strict'

/**
 * @interface
 */
class RegistryEvents {
  /**
   * Announce global object.
   *
   * Notify the client of global objects.
   * The event notifies the client that a global object with
   * the given name is now available, and it implements the
   * given version of the given interface.
   *
   * @param {number} name unique numeric name of the global object
   * @param {string} interface_ interface implemented by the global
   * @param {number} version maximum supported interface version of the global
   */
  global (name, interface_, version) {}

  /**
   * Announce removal of global object.
   *
   * Notify the client of removed global objects.
   * This event notifies the client that the global identified
   * by name is no longer available.  If the client bound to
   * the global using the bind request, the client should now
   * destroy that object.
   *
   * The object remains valid and requests to the object will be
   * ignored until the client destroys it, to avoid races between
   * the global going away and a client sending a request to it.
   *
   * @param {number} name
   */
  globalRemove (name) {}
}

module.exports = RegistryEvents