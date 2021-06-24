require("./receiver.css");
var QRCode = require("qrcode");
require("peerjs");

function queryString(params) {
  return Object.keys(params)
    .map((key) => key + "=" + params[key])
    .join("&");
}

export class Receiver {
  #lastPeerId;
  constructor(keypad_params, on_data_callback) {
    this.peer = new Peer(null, { debug: 2 });
    this.conn = null;
    this.data_callback = on_data_callback;
    this.#lastPeerId = null;
    // DELETE this.#peerId = null;

    this.alphabet = keypad_params["alphabet"];
    this.font = keypad_params["font"];

    this.display_element =
      "display_element_id" in keypad_params
        ? keypad_params["display_element_id"]
        : null;
    this.initialize();
  }
  initialize = () => {
    /* Create the Peer object for our end of the connection. */
    /* Set up callbacks that handle any events related to our peer object. */

    // TODO parameterize using a different PeerJS Server
    // Create own peer object with connection to shared PeerJS server
    // this.peer = new Peer(null, { debug: 2 });
    console.log("This peer: ", this.peer);
    this.peer.on("open", this.on_peer_open);
    this.peer.on("connection", this.on_peer_connection);
    this.peer.on("disconnected", this.on_peer_disconnected);
    this.peer.on("close", this.on_peer_close);
    this.peer.on("error", this.on_peer_error);
  };
  display_update = (message, append = false) => {
    // If the specified elem exists, update that elem
    if (!!document.getElementById(this.display_element)) {
      const display_elem = document.getElementById(this.display_element);
      if (append) {
        display_elem.innerText += message;
      } else {
        display_elem.innerText = message;
      }
    } else {
      console.log("RECEIVER MESSAGE: ", message);
    }
  };
  update_alphabet = (alphabet) => {
    // Get an array of unique symbols
    console.log('New alphabet: ', alphabet);
    try {
      console.log('DEBUG sending new alphabet');
      this.conn.send({'alphabet': alphabet});
    } catch (e) {
      this.display_update("Error in updating alphabet! ", e);
    }
  };
  update_font = (font) => {
    // TODO check if the font is supported, somehow
    try {
      this.conn.send({'font': font});
    } catch (e) {
      this.display_update("Error in updating font! ", e);
    }
  };
  on_peer_open = (id) => {
    // Workaround for peer.reconnect deleting previous id
    if (this.id === null) {
      console.log("Received null id from peer open");
      this.peer.id = this.#lastPeerId;
    } else {
      this.#lastPeerId = this.peer.id;
    }

    const params = {
      alphabet: this.alphabet,
      font: this.font,
      peerID: this.peer.id,
    };

    let query_string = queryString(params);
    // Assuming you are serving the receiver and keypad from the same domain
    // const uri =
    //   window.location.protocol +
    //   window.location.hostname +
    //   "/keypad?" +
    //   query_string;
    const uri = 'https://testtestgus.xyz/keypad?' + query_string;

    // Display QR code for the participant to scan
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, uri, function (error) {
      if (error) console.error(error);
    });
    if (!!document.getElementById(this.display_element)) {
      document.getElementById(this.display_element).appendChild(qrCanvas);
    } else {
      console.log("Peer reachable at: ", uri);
    }
  };
  on_peer_connection = (c) => {
    // Allow only a single connection
    if (this.conn && this.conn.open) {
      c.on("open", function () {
        c.send("Already connected to another client");
        setTimeout(function () {
          c.close();
        }, 500);
      });
      return;
    }
    this.conn = c;
    this.display_update("Connected to: ", this.conn.peer);
    this.ready();
  };
  on_peer_disconnected = () => {
    this.display_update("Connection lost. Please reconnect");
    // Workaround for peer.reconnect deleting previous id
    this.peer.id = this.#lastPeerId;
    this.peer._lastServerId = this.#lastPeerId;
    this.peer.reconnect();
  };
  on_peer_close = () => {
    this.conn = null;
    this.display_element.innerHTML = "Connection destroyed. Please refresh";
    console.log("Connection destroyed");
  };
  on_peer_error = (err) => {
    console.log(err);
    alert("" + err);
  };
  ready = () => {
    /*
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    // Perform callback with data
    this.conn.on("data", this.data_callback);
    this.conn.on("close", () => {
      this.display_update("Connection reset<br>Awaiting connection...");
      this.conn = null;
    });
  };
}
/* 
Helpful SO links:
https://stackoverflow.com/questions/28016664/when-you-pass-this-as-an-argument/28016676#28016676
*/
