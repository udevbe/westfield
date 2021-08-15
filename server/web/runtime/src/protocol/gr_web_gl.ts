/*
 *
 *        Copyright © 2019 Erik De Rijcke
 *
 *        Permission is hereby granted, free of charge, to any person
 *        obtaining a copy of this software and associated documentation files
 *        (the "Software"), to deal in the Software without restriction,
 *        including without limitation the rights to use, copy, modify, merge,
 *        publish, distribute, sublicense, and/or sell copies of the Software,
 *        and to permit persons to whom the Software is furnished to do so,
 *        subject to the following conditions:
 *
 *        The above copyright notice and this permission notice (including the
 *        next paragraph) shall be included in all copies or substantial
 *        portions of the Software.
 *
 *        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *        NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 *        BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 *        ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 *        CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *        SOFTWARE.
 *    
 */

import { WlMessage, fileDescriptor, uint, int, 
	fixed, object, objectOptional, newObject, string, stringOptional, 
	array, arrayOptional, u, i, f, oOptional, o, n, sOptional, s, aOptional, a, h,	WebFD, Fixed } from 'westfield-runtime-common'
import * as Westfield from '..'

export class GrWebGlBufferResource extends Westfield.Resource {
	static readonly protocolName = 'gr_web_gl_buffer'

	//@ts-ignore Should always be set when resource is created.
	implementation: any


	/**
	 *
	 *                Provides the client with an offscreen canvas, capable of doing WebGL operations.
	 *                The canvas can be resized and drawn to according to the offscreen canvas specifications.
	 *                The canvas event is send as soon as the gr_web_gl_buffer is wrapped using the create_buffer request
	 *                in the global gr_web_gl singleton.
	 *
	 *                The reported buffer size will be same as the size of the canvas. Buffer content will be the canvas
	 *                content. Offscreen Canvas content is send to the compositor canvas after the web-worker event loop
	 *                cycles as per HTML5 offscreen canvas specifications. As such it is not required to perform double
	 *                buffering by the client as this is taken care of by the offscreen canvas implementation in the browser.
	 *                The client however is still required to attach and commit the (same) buffer to trigger a surface render.
	 *            
	 *
	 * @param canvas  
	 *
	 * @since 1
	 *
	 */
	offscreenCanvas (canvas: WebFD) {
		this.client.marshall(this.id, 0, [fileDescriptor(canvas)])
	}
	constructor (client: Westfield.Client, id: number, version: number) {
		super(client, id, version)
	}

}

/**
 *
 *            A singleton global object that provides support for web gl.
 *
 *            Clients can create wl_buffer objects using the create_buffer request.
 *        
 */
export class GrWebGlResource extends Westfield.Resource {
	static readonly protocolName = 'gr_web_gl'

	//@ts-ignore Should always be set when resource is created.
	implementation: GrWebGlRequests

	constructor (client: Westfield.Client, id: number, version: number) {
		super(client, id, version)
	}

	[0] (message: WlMessage) {
		return this.implementation.createWebGlBuffer(this, n(message))
	}
	[1] (message: WlMessage) {
		return this.implementation.createBuffer(this, n(message), o<Westfield.GrWebGlBufferResource>(message, this.client.connection))
	}
}

export interface GrWebGlRequests {

	/**
	 *
	 *                Create a web_gl_buffer object.
	 *            
	 *
	 * @param resource The protocol resource of this implementation.
	 * @param id The gr_web_gl buffer to create. 
	 *
	 * @since 1
	 *
	 */
	createWebGlBuffer(resource: GrWebGlResource, id: number): void

	/**
	 *
	 *                Create a wl_buffer object from a gr_web_gl_buffer so it can be used with a surface.
	 *            
	 *
	 * @param resource The protocol resource of this implementation.
	 * @param id The buffer to create. 
	 * @param grWebGlBuffer The gr_web_gl_buffer to wrap. 
	 *
	 * @since 1
	 *
	 */
	createBuffer(resource: GrWebGlResource, id: number, grWebGlBuffer: Westfield.GrWebGlBufferResource): void
}

