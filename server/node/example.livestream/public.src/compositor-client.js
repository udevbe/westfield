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

    const peerConnectionConfig = {
        'iceServers': [
            {'urls': 'stun:stun.services.mozilla.com'},
            {'urls': 'stun:stun.l.google.com:19302'},
        ]
    };

    const peerConnection = new RTCPeerConnection(peerConnectionConfig);

    peerConnection.onicecandidate = (evt) => {
        if (evt.candidate !== null) {
            streamSource.client_stream_description(JSON.stringify({"candidate": evt.candidate}));
        }
    };

    streamSource.listener.server_stream_description = (description) => {

        const signal = JSON.parse(description);

        if (signal.sdp) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).catch((error) => {
                console.log("Error: Failure during setRemoteDescription()", error);
                connection.close();
            });
        } else if (signal.candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(error => {
                console.log("Error: Failure during addIceCandidate()", error);
                connection.close();
            });
        }
    };

    const channel = peerConnection.createDataChannel(streamSource.id, {ordered: false, maxRetransmits: 0});
    newStreamChannel(channel);

    peerConnection.createOffer().then((desc) => {
        return peerConnection.setLocalDescription(desc);
    }).then(() => {
        streamSource.client_stream_description(JSON.stringify({"sdp": peerConnection.localDescription}));
    }).catch((error) => {
        console.error(error);
        streamSource.client.close();
    });
}

function newStreamChannel(receiveChannel) {

    //TODO create video & MSE

    receiveChannel.onmessage = function (event) {
        //TODO add blob to video source buffer
        console.log(event.data);
    };
}




