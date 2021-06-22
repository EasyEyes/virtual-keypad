require('./receiver.css');
var QRCode = require('qrcode')
require('peerjs');

export var keypad_communications = [];

function queryString(params) {
    return Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

export function keypad_receiver(keypad_params, callback){
    var lastPeerId = null;
    var peer = null; // Own peer object
    var peerId = null;
    var conn = null;
    var alphabet = null;
    var font = null;

    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {
        // Create own peer object with connection to shared PeerJS server
        peer = new Peer(null, {
            debug: 2
        });

        peer.on('open', function (id) {
            // Workaround for peer.reconnect deleting previous id
            if (peer.id === null) {
                console.log('Received null id from peer open');
                peer.id = lastPeerId;
            } else {
                lastPeerId = peer.id;
            }

            console.log('ID: ' + peer.id);
            // recvId.innerHTML = "ID: " + peer.id;
            // status.innerHTML = "Awaiting connection...";


            // TODO verify parameters
            alphabet = keypad_params['alphabet'];
            font = keypad_params['font'];
            const params = { 'alphabet': alphabet, 
                            'font': font, 
                            'peerID': peer.id };
            let query_string = queryString(params);
            // TODO generalize to not just my domain
            const uri = window.location.protocol + window.location.hostname + '/keypad?' + query_string;
            // const uri = 'https://testtestgus.xyz/keypad?' + query_string;
            console.log(uri);

            // Display QR code for the participant to scan
            console.log("QR code sending user to: ", uri);
            // new QRCode(document.querySelector("main"), uri);
            const qrCanvas = document.createElement("canvas");
            QRCode.toCanvas(qrCanvas, uri, function (error) {
                if (error) console.error(error)
                console.log('success!');
              });
            document.getElementById("main").appendChild(qrCanvas);
        });
        peer.on('connection', function (c) {
            // Allow only a single connection
            if (conn && conn.open) {
                c.on('open', function() {
                    c.send("Already connected to another client");
                    setTimeout(function() { c.close(); }, 500);
                });
                return;
            }

            conn = c;
            console.log("Connected to: " + conn.peer);
            status.innerHTML = "Connected";
            ready();
        });
        peer.on('disconnected', function () {
            status.innerHTML = "Connection lost. Please reconnect";
            console.log('Connection lost. Please reconnect');

            // Workaround for peer.reconnect deleting previous id
            peer.id = lastPeerId;
            peer._lastServerId = lastPeerId;
            peer.reconnect();
        });
        peer.on('close', function() {
            conn = null;
            status.innerHTML = "Connection destroyed. Please refresh";
            console.log('Connection destroyed');
        });
        peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });
    };

    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    function ready() {
        conn.on('data', function (data) {
            // Record communciation
            window.keypad_communications.push(data);
            // Perform callback with data
            callback(data);

            console.log("Data recieved, ", data);
            // switch (data) {
            //     // case 'Reset':
            //     //     reset();
            //     //     addMessage(cueString + data);
            //     //     break;
            //     default:
            //         communications.push(
            //             JSON.parse(data)['response']);
            //         updateDataDisplay();
            // };
        });
        conn.on('close', function () {
            status.innerHTML = "Connection reset<br>Awaiting connection...";
            conn = null;
        });
    }
    initialize();
};
