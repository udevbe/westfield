#!/usr/bin/env node
'use strict';

const wfs = require('./westfield-server-streams.js');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const streamSource = new wfs.Global("stream_source", 1);
streamSource.bindClient = function (client, id, version) {

    const resource = new wfs.stream_source(client, id, version);

    resource.implementation.client_stream_description = clientStreamDescription;
    resource.implementation.stream_handle = streamHandle;
};

function clientStreamDescription(resource, description) {

}

function streamHandle(resource, stream_handle, stream_token) {
    stream_handle.implementation.ack_frame = ackFrame;
}

function ackFrame(resource, frame_id) {

}

//Create westfield server. Required to expose global singleton protocol objects to clients.
const wfsServer = new wfs.Server();

//Register the global so clients can find it when they connect.
wfsServer.registry.register(streamSource);

//setup connection logic (http+websocket)
const app = express();
app.use(express.static('public'));

const server = http.createServer();
server.on('request', app);
const wss = new WebSocket.Server({
    server: server,
    path: "/westfield"
});

//listen for new websocket connections.
wss.on('connection', function connection(ws) {

    //Make sure we detected disconnects asap.
    ws._socket.setKeepAlive(true);

    //A new connection was established. Create a new westfield client object to represent this connection.
    const client = wfsServer.createClient();

    //Wire the send callback of this client object to our websocket.
    client.onSend = function (wireMsg) {
        if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
            //Fail silently as we will soon receive the close event which will trigger the cleanup.
            return;
        }

        try {
            ws.send(wireMsg, function (error) {
                if (error !== undefined) {
                    console.error(error);
                    ws.close();
                }
            });
        } catch (error) {
            console.error(error);
            ws.close();
        }
    };

    //Wire data receiving from the websocket to the client object.
    ws.onmessage = function incoming(message) {
        try {
            //The client object expects an ArrayBuffer as it's argument.
            //Slice and get the ArrayBuffer of the Node Buffer with the provided offset, else we take too much data into account.
            client.message(message.data.buffer.slice(message.data.offset, message.data.length + message.data.offset));
        } catch (error) {
            console.error(error);
            ws.close();
        }
    };

    //Wire closing of the websocket to our client object.
    ws.onclose = function () {
        client.close();
    };

    //Tell the client object we ready to handle protocol communication.
    client.open();
});

//Listen for incoming http requests on port 8080.
server.listen(8080);



