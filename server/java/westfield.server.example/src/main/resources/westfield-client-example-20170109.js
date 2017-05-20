/*
 *
 *        Example HTML5 Protocol
 *        Copyright (C) 2017 Erik De Rijcke
 *
 *        This program is free software: you can redistribute it and/or modify
 *        it under the terms of the GNU Affero General Public License as
 *        published by the Free Software Foundation, either version 3 of the
 *        License, or (at your option) any later version.
 *
 *        This program is distributed in the hope that it will be useful,
 *        but WITHOUT ANY WARRANTY; without even the implied warranty of
 *        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *        GNU Affero General Public License for more details.
 *
 *        You should have received a copy of the GNU Affero General Public License
 *        along with this program. If not, see >http://www.gnu.org/licenses/<.
 *    
 */

/**
 */
wfc.example_global = class example_global extends wfc.WObject {

	/**
	 *
	 * @return {example_clock} A new example clock. 
	 *
	 * @since 1
	 *
	 */
	create_example_clock() {
		return this.connection._marshallConstructor(this._id, 1, "example_clock", [wfc._newObject()]);
	}

	constructor(connection) {
		super(connection, {
			name: "example_global",
			version: 1,
		});
	}

};
wfc.example_clock = class example_clock extends wfc.WObject {

	constructor(connection) {
		super(connection, {
			name: "example_clock",
			version: 1,

			/**
			 *
			 * @param {Number} the_time The updated time. 
			 *
			 * @since 1
			 *
			 */
			time_update(the_time) {},
		});
	}

	[1](message){
		const args = this.connection._unmarshallArgs(message,"u");
		this.listener.time_update.call(this.listener, args[0]);
	}

};
