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

export class GrWebShmBufferResource extends Westfield.Resource {
	static readonly protocolName = 'gr_web_shm_buffer'

	//@ts-ignore Should always be set when resource is created.
	implementation: GrWebShmBufferRequests


	/**
	 *
	 *                Detaches a previously attached HTML5 array buffer from the compositor and returns it to the client so
	 *                it can be reused again for writing. After detaching, the array buffer ownership is passed from
	 *                the compositor main thread back to the client.
	 *            
	 *
	 * @param contents An HTML5 array buffer, detached from the compositor 
	 *
	 * @since 1
	 *
	 */
	detach (contents: WebFD) {
		this.client.marshall(this.id, 0, [fileDescriptor(contents)])
	}
	constructor (client: Westfield.Client, id: number, version: number) {
		super(client, id, version)
	}

	[0] (message: WlMessage) {
		return this.implementation.attach(this, h(message))
	}
}

export interface GrWebShmBufferRequests {

	/**
	 *
	 *                Attaches an HTML5 array buffer to the compositor. After attaching, the array buffer ownership is passed
	 *                to the compositor main thread. The array buffer can not be used for writing anymore by the client as
	 *                per HTML5 Transferable objects spec.
	 *
	 *                The pixel format of the attached array buffer must always be RGBA8888 as per HTML5 ImageData spec.
	 *                Stride must always equal width.
	 *            
	 *
	 * @param resource The protocol resource of this implementation.
	 * @param contents An HTML5 array buffer to attach to the compositor. 
	 *
	 * @since 1
	 *
	 */
	attach(resource: GrWebShmBufferResource, contents: WebFD): void
}


/**
 *
 *            A singleton global object that provides support for shared memory through HTML5 array buffers.
 *
 *            Clients can create wl_buffer objects using the create_buffer request.
 *        
 */
export class GrWebShmResource extends Westfield.Resource {
	static readonly protocolName = 'gr_web_shm'

	//@ts-ignore Should always be set when resource is created.
	implementation: GrWebShmRequests

	constructor (client: Westfield.Client, id: number, version: number) {
		super(client, id, version)
	}

	[0] (message: WlMessage) {
		return this.implementation.createWebArrayBuffer(this, n(message))
	}
	[1] (message: WlMessage) {
		return this.implementation.createBuffer(this, n(message), o<Westfield.GrWebShmBufferResource>(message, this.client.connection), i(message), i(message))
	}
}

export interface GrWebShmRequests {

	/**
	 *
	 *                Create a gr_web_shm_buffer object.
	 *            
	 *
	 * @param resource The protocol resource of this implementation.
	 * @param id web shm buffer to create 
	 *
	 * @since 1
	 *
	 */
	createWebArrayBuffer(resource: GrWebShmResource, id: number): void

	/**
	 *
	 *                Create a wl_buffer object from a web_array_buffer so it can be used with a surface.
	 *            
	 *
	 * @param resource The protocol resource of this implementation.
	 * @param id buffer to create 
	 * @param webArrayBuffer The gr_web_array_buffer to wrap 
	 * @param width Buffer width, in pixels. 
	 * @param height Buffer height, in pixels. 
	 *
	 * @since 1
	 *
	 */
	createBuffer(resource: GrWebShmResource, id: number, webArrayBuffer: Westfield.GrWebShmBufferResource, width: number, height: number): void
}

