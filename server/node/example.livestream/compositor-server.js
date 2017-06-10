#!/usr/bin/env node
'use strict';

const wfs = require('./westfield-server-streams.js');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const webrtc = require('wrtc');

const spawn = require('child_process').spawn;

const streamSource = new wfs.Global("stream_source", 1);
streamSource.bindClient = function (client, id, version) {

    const streamSource = new wfs.stream_source(client, id, version);

    streamSource.implementation.peerConnection = new webrtc.RTCPeerConnection({
        'iceServers': [
            {'urls': 'stun:stun.services.mozilla.com'},
            {'urls': 'stun:stun.l.google.com:19302'},
        ]
    });

    streamSource.implementation.client_stream_description = clientStreamDescription;
    streamSource.implementation.stream_handle = streamHandle;

    setupChannel(streamSource);
};

/**
 * @param {wfs.stream_source} streamSource
 */
function setupChannel(streamSource) {

    streamSource.implementation.peerConnection.onicecandidate = (evt) => {
        if (evt.candidate !== null) {
            streamSource.server_stream_description(JSON.stringify({"candidate": evt.candidate}));
        }
    };

    streamSource.implementation.peerConnection.ondatachannel = (event) => {
        const datachannel = event.channel;

        datachannel.onopen = function (event) {
            pushFrames(datachannel);
        };

        datachannel.onmessage = function (event) {
            console.log(event.data);
        }
    };
}

class RtpFrameReader {
    constructor(rtpStream) {
        this.frameBytesRemaining = 0;
        this.rtpFrame = null;

        //in case of partial header
        this.busyReadingHeader = false;

        rtpStream.on('data', (chunk) => {
            this.parseChunk(chunk);
        });
    }

    parseChunk(chunk) {
        chunk.bytesRemaining = chunk.length;

        //loop until there is no more data to process
        while (chunk.bytesRemaining > 0) {

            //Check if we've only read the first byte of the header
            if (this.busyReadingHeader) {
                //we've already read the first part, so OR  the new part with what we've already got.
                this.frameBytesRemaining &= chunk.readUInt8(0);
                chunk.bytesRemaining -= 1;
                this.busyReadingHeader = false;

                //allocate new rtp buffer based on the size the header gave us.
                this.rtpFrame = Buffer.allocUnsafe(this.frameBytesRemaining);

            } else
            //We're not busy reading the header, and have not read any header at all in fact.
            if (this.frameBytesRemaining === 0) {
                //Check if we can read at least 2 bytes to make sure we can read the entire header
                if (chunk.bytesRemaining >= 2) {
                    this.frameBytesRemaining = chunk.readInt16BE(0, true);
                    chunk.bytesRemaining -= 2;

                    //allocate new rtp buffer based on the size the header gave us.
                    this.rtpFrame = Buffer.allocUnsafe(this.frameBytesRemaining);
                } else {
                    //we can only read the header partially
                    this.busyReadingHeader = true;
                    this.frameBytesRemaining = chunk.readUInt8(0);
                    chunk.bytesRemaining -= 1;
                    this.frameBytesRemaining = this.frameBytesRemaining << 8;
                }
            }

            if (chunk.bytesRemaining > 0) {
                //read the rest of the rtp frame

                //copy as much data as possible from the chunk into the rtp frame.
                const maxBytesToCopy = chunk.bytesRemaining >= this.frameBytesRemaining ? this.frameBytesRemaining : chunk.bytesRemaining;
                const bytesCopied = chunk.copy(this.rtpFrame, this.rtpFrame.length - this.frameBytesRemaining, chunk.length - chunk.bytesRemaining, maxBytesToCopy);
                this.frameBytesRemaining -= bytesCopied;
                chunk.bytesRemaining -= bytesCopied;
            }

            if (this.frameBytesRemaining === 0) {
                this.frameBytesRemaining = 0;
                this.onRtpFrame(this.rtpFrame);
                this.rtpFrame = null;
            }
        }
    }

    onRtpFrame(rtpFrame) {

    }
}

function pushFrames(dataChannel) {
    const rtpStream = spawn("gst-launch-1.0", ["videotestsrc", "!", "videoconvert", "!", "video/x-raw,format=RGB,width=320", "!", "videoconvert", "!", "video/x-raw,format=I420,width=320", "!", "x264enc", "!", "rtph264pay", "!", "rtpstreampay", "!", "fdsink"]).stdout;

    new RtpFrameReader(rtpStream).onRtpFrame = (rtpFrame) => {
        dataChannel.send(rtpFrame);
    };
}

/**
 * @param {wfs.stream_source} streamSource
 * @param {string} description
 */
function clientStreamDescription(streamSource, description) {

    const signal = JSON.parse(description);

    if (signal.sdp) {

        streamSource.implementation.peerConnection.setRemoteDescription(new webrtc.RTCSessionDescription(signal.sdp)).then(() => {
            return streamSource.implementation.peerConnection.createAnswer();
        }).then((desc) => {
            return streamSource.implementation.peerConnection.setLocalDescription(desc);
        }).then(() => {
            streamSource.server_stream_description(JSON.stringify({"sdp": streamSource.implementation.peerConnection.localDescription}));
        }).catch((error) => {
            console.log(error);
            streamSource.client.close();
        });

    } else if (signal.candidate) {
        streamSource.implementation.peerConnection.addIceCandidate(new webrtc.RTCIceCandidate(signal.candidate)).catch((error) => {
            console.log("Error: Failure during addIceCandidate()", error);
            streamSource.client.close();
        });
    }
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



