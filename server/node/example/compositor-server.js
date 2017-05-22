#!/usr/bin/env node
'use strict';
const wfs = require('./westfield-server-example.js');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');


const app = express();
app.use(express.static('public'));

const server = http.createServer();
server.on('request', app);

const wss = new WebSocket.Server({
    server: server,
    path: "/westfield"
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('something');
});

server.listen(8080);



