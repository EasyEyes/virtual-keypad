// import { QRCode  } from "qrcode";
var QRCode = require("qrcode");
import "./receiver.css";
import { KeypadPeer } from "./keypadPeer.js";

class Receiver extends KeypadPeer {
  constructor(keypadParameters, onDataCallback) {
    super(keypadParameters.keypadURL, keypadParameters.targetElementId);
    this.onDataCallback = onDataCallback;

    this.alphabet = keypadParameters["alphabet"];
    this.font = keypadParameters["font"];

    /* Set up callbacks that handle any events related to our peer object. */
    console.log("DEBUG This peer: ", this.peer);
    this.peer.on("open", this.#onPeerOpen);
    this.peer.on("connection", this.#onPeerConnection);
    this.peer.on("disconnected", this.onPeerDisconnected);
    this.peer.on("close", this.onPeerClose);
    this.peer.on("error", this.onPeerError);
  }
  updateAlphabet = (alphabet) => {
    // Get an array of unique symbols
    this.displayUpdate("New alphabet: " + String(alphabet), true);
    try {
      this.conn.send({ alphabet: alphabet });
    } catch (e) {
      this.displayUpdate("Error in updating alphabet! ", e);
      console.error(e);
    }
  };
  updateFont = (font) => {
    // TODO check if the font is supported, somehow
    try {
      this.conn.send({ font: font });
    } catch (e) {
      this.displayUpdate("Error in updating font! ");
      console.error(e);
    }
  };
  #onPeerOpen = (id) => {
    // Workaround for peer.reconnect deleting previous id
    if (this.id === null) {
      this.displayUpdate("Received null id from peer open");
      this.peer.id = this.lastPeerId;
    } else {
      this.lastPeerId = this.peer.id;
    }

    const params = {
      alphabet: this.alphabet,
      font: this.font,
      peerID: this.peer.id,
    };

    let queryString = this.queryStringFromObject(params);
    const uri = this.keypadUrl + queryString;

    // Display QR code for the participant to scan
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(qrCanvas, uri, function (error) {
      if (error) console.error(error);
    });
    if (!!document.getElementById(this.targetElement)) {
      document.getElementById(this.targetElement).appendChild(qrCanvas);
    } else {
      console.log("Peer reachable at: ", uri);
    }
  };
  #onPeerConnection = (connection) => {
    // Allow only a single connection
    if (this.conn && this.conn.open) {
      connection.on("open", function () {
        connection.send("Already connected to another client");
        setTimeout(function () {
          connection.close();
        }, 500);
      });
      return;
    }
    this.conn = connection;
    this.displayUpdate("Connected to: ", this.conn.peer);
    this.#ready();
  };
  #ready = () => {
    /*
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    // Perform callback with data
    this.conn.on("data", (data) => {
      this.onDataCallback(data);
      this.displayUpdate(data, true);
    });
    this.conn.on("close", () => {
      this.displayUpdate("Connection reset<br>Awaiting connection...");
      this.conn = null;
    });
  };
}
/* 
Referenced links:
https://stackoverflow.com/questions/28016664/when-you-pass-this-as-an-argument/28016676#28016676
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
*/

export { Receiver };