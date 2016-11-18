//TODO connection routine
//TODO wire protocol
//TODO wire protocol parser & handler

//define westfield namespace as wf
var wf = wf || {};

//westfield display "class"
var Display = function () {

    //display object always has id 1.
    this.id = 1;

    //--public--
    this.connect = function (url) {
        //TODO create & configure websocket
        this.socket = setupSocket(url);
    };

    this.disconnect = function () {

    };

    //--private--
    var setupSocket = function (url) {
        var socket = new WebSocket(url, "westfield");
        socket.onopen = onSocketOpen;
        socket.onmessage = onSocketMessage;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;

        return socket;
    };

    var onSocketOpen = function (event) {

    };

    var onSocketMessage = function (event) {

    }

    var onSocketClose = function (event) {

    }

    var onSocketError = function (event) {

    }
};

//westfield display singleton
wf.Display = new Display();