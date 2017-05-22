#!/usr/bin/env node
'use strict';


const wfs = require('./westfield-server-example.js');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });







