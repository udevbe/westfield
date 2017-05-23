#!/usr/bin/env node
'use strict';

const wfs = require('./westfield-server-example.js');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

//create westfield server.
const wfsServer = new wfs.Server();

//create global clock factory implementation
const exampleGlobal = new wfs.Global("example_global", 1);
exampleGlobal.bindClient = function (client, id, version) {
    //create an example global resource when a client binds to it.
    const resource = new wfs.example_global(client, id, version);
    //assign factory method
    resource.implementation.create_example_clock = createExampleClock;
};

//implement factory method
function createExampleClock(resource, id) {
    const clockResource = new wfs.example_clock(resource.client, id, 1);

    setInterval(function () {
        clockResource.time_update(new Date().getTime());
    }, 1);
}

wfsServer.registry.register(exampleGlobal);

//setup connection logic
const app = express();
app.use(express.static('public'));

const server = http.createServer();
server.on('request', app);
const wss = new WebSocket.Server({
    server: server,
    path: "/westfield"
});

wss.on('connection', function connection(ws) {

    ws._socket.setKeepAlive(true);

    const client = wfsServer.createClient();

    client.doSend = function (wireMsg) {
        try {
            ws.send(wireMsg, function (error) {
                if (error !== undefined) {
                    console.error(error);
                    client.onClose();
                }
            });
        } catch (error) {
            console.error(error);
            client.onClose();
        }
    };


    ws.on('message', function incoming(message) {
        try {
            client.onReceive(message.buffer.slice(message.offset, message.length + message.offset));
        } catch (error) {
            console.error(error);
            client.onClose();
        }
    });

    ws.on('close', function () {
        client.onClose();
    });

    client.onConnect();
});

server.listen(8080);



