"use strict";
const wfc = require("./westfield-client-streams");

const connection = new wfc.Connection("ws://127.0.0.1:8080/westfield");
connection.registry.listener.global = (name, interface_, version) => {
    if (interface_ === "stream_source") {
        const streamSource = connection.registry.bind(name, interface_, version);
        setupDataChannels(streamSource);
    }
};

function setupDataChannels(streamSource) {
    const peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = (evt) => {
        streamSource.client_stream_description(JSON.stringify({"candidate": evt.candidate}));
    };

    streamSource.server_stream_description = (description) => {

        const signal = JSON.parse(description);

        if (signal.sdp) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            peerConnection.createAnswer().then((answer) => {
                peerConnection.setLocalDescription(answer);
            }).then(() => {
                streamSource.client_stream_description(JSON.stringify({"sdp": peerConnection.localDescription}));
            }).catch((error) => {
                console.log(error);
                connection.close();
            });

        } else {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    };

    peerConnection.ondatachannel = (event) => {
        newStreamChannel(event.channel)
    };
}

function newStreamChannel(receiveChannel) {

    //TODO create video & MSE

    receiveChannel.onmessage = function (event) {
        //TODO add blob to video source buffer
        console.log(event);
    };
}




