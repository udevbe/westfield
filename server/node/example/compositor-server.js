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

//create westfield server
const wfsServer = new wfs.Server();

//create global clock factory implementation
const exampleGlobal = new wfs.Global("example_global", 1);
exampleGlobal.bindClient = function (client, id, version) {
    const resource = new wfs.example_global(client, id, version);
    resource.implementation.create_example_clock = (id) => {

    };
};

wfsServer.registry.register(exampleGlobal);

wss.on('connection', function connection(ws) {

    ws._socket.setKeepAlive(true);

    const client = wfsServer.createClient();

    client.doSend = function (wireMsg) {
        ws.send(wireMsg, function (error) {
            console.error(error);
            client.onClose();
        });
    };

    ws.on('message', function incoming(message) {
        client.onReceive(message);
    });

    ws.on('close', function () {
        client.onClose();
    });

    client.onConnect();
});

server.listen(8080);



