// import { QRCode  } from "qrcode";
var QRCode = require("qrcode");
// import "./receiver.css";
import { KeypadPeer } from "./keypadPeer.js";

const doNothing = () => undefined;

/**
 * @param {{alphabet: string[], font:string}} keypadParameters
 * @param {(data) => void} onDataCallback
 * @param {() => void} handshakeCallback
 * @param {(connection) => void} customConnectionCallback
 * @param {() => void} customCloseCallback
 * @param {(error) => void} customErrorCallback
 */
class Receiver extends KeypadPeer {
  constructor(
    keypadParameters,
    onDataCallback = doNothing,
    handshakeCallback = doNothing,
    customConnectionCallback = doNothing,
    customCloseCallback = doNothing,
    customErrorCallback = doNothing
  ) {
    super({
      targetElementId: keypadParameters.targetElementId,
      onErrorReconnectMessage: keypadParameters.onErrorReconnectMessage,
    });
    keypadParameters = this.#verifyKeypadParameters(keypadParameters);

    this.alphabet = this.checkAlphabet(keypadParameters["alphabet"]); // What symbols to display on the keys
    this.font = keypadParameters["font"]; // What fontface to display the symbols in
    this.controlButtons = keypadParameters["controlButtons"];
    this.onErrorReconnectMessage =
      keypadParameters.onErrorReconnectMessage ??
      "Connection lost. Please reconnect...";

    this.onData = onDataCallback; // What to do on a button-press
    this.onHandshake = () => {
      handshakeCallback();
      this._setupHeartBeatIntervals();
    }; // What to do when the connection is established
    this.onConnection = (connection) => {
      this.#onPeerConnection(connection);
      customConnectionCallback(connection);
    };
    this.onClose = () => {
      this.onPeerClose();
      customCloseCallback();
    };
    this.onError = (err) => {
      this.onPeerError(err);
      customErrorCallback(err);
    };

    /* Set up callbacks that handle any events related to our peer object. */
    this.peer.on("open", this.#onPeerOpen); // On creation of Receiver (local) Peer object
    this.peer.on("connection", this.onConnection); // On connection with Keypad (remote) Peer object
    this.peer.on("disconnected", this.onPeerDisconnected);
    this.peer.on("close", this.onClose);
    this.peer.on("error", this.onError);
  }
  update = (alphabet = undefined, font = undefined) => {
    // Update alphabet
    if (typeof alphabet !== "undefined") {
      const validAlphabet = this.checkAlphabet(alphabet);
      if (String(this.alphabet) !== String(validAlphabet))
        this.displayUpdate("New alphabet: " + String(validAlphabet), true); // DEBUG
      this.alphabet = validAlphabet; // Store new alphabet
    }

    // Update font
    // TODO check if the font is supported, somehow
    this.font = font ?? this.font; // Store new font

    // Update keypad
    try {
      this.conn.send({
        message: "Update",
        alphabet: this.alphabet,
        font: this.font,
        peerID: this.peer.id,
      });
    } catch (e) {
      this.displayUpdate(
        `Error updating! Alphabet: ${String(this.alphabet)}, font: ${
          this.font
        }`,
        e
      ); // DEBUG
      console.error(e);
    }
  };
  disableKeys = (whichKeys = undefined) => {
    const message = {
      message: "Disable",
    };
    if (whichKeys) message.keys = whichKeys;
    try {
      this.conn.send(message);
    } catch (e) {
      this.displayUpdate(`Error disabling keys. Keys: ${whichKeys}`);
      console.error(e);
    }
  };
  enableKeys = (whichKeys = undefined) => {
    const message = {
      message: "Enable",
    };
    if (whichKeys) message.keys = whichKeys;
    try {
      this.conn.send(message);
    } catch (e) {
      this.displayUpdate(`Error enabling keys. Keys: ${whichKeys}`);
      console.error(e);
    }
  };
  updateDisplayMessage = (message) => {
    try {
      this.conn.send({
        message: "UpdateHeader",
        headerContent: message,
      });
    } catch (e) {
      this.displayUpdate("Error in updating message!"); // DEBUG
      console.error(e);
    }
  };
  updateFooterMessage = (message) => {
    try {
      this.conn.send({
        message: "UpdateFooter",
        headerContent: message,
      });
    } catch (e) {
      this.displayUpdate("Error in updating footer message."); // Debug
      console.error(e);
    }
  };
  #verifyKeypadParameters = (keypadParameters) => {
    if (!keypadParameters.hasOwnProperty("alphabet")) {
      console.error(
        "Must provide 'alphabet' parameter to Receiver object. Defaulting to 'CDHKNORSVZ'"
      );
      keypadParameters["alphabet"] = "CDHKNORSVZ".split("");
    } else {
      keypadParameters["alphabet"] = this.checkAlphabet(
        keypadParameters.alphabet
      );
    }
    if (!keypadParameters.hasOwnProperty("font")) {
      console.error(
        "Must provide 'font' parameter to Receiver object. Defaulting to 'Arial'"
      );
      keypadParameters["alphabet"] = "Arial";
    } else {
      // FUTURE verify that the selected font is available
    }
    return keypadParameters;
  };
  #onPeerOpen = (id) => {
    // Workaround for peer.reconnect deleting previous id
    if (this.id === null) {
      this.displayUpdate("Received null id from peer open"); // DEBUG
      this.peer.id = this.lastPeerId;
    } else {
      this.lastPeerId = this.peer.id;
    }

    const params = {
      // alphabet: this.alphabet,
      // font: this.font,
      peerID: this.peer.id,
    };

    let queryString = this.queryStringFromObject(params);
    const uri = this.keypadUrl + queryString;
    this.qrURL = uri;
    console.log(this.qrURL);

    // Display QR code for the participant to scan
    const qrCanvas = document.createElement("canvas");

    QRCode.toCanvas(qrCanvas, uri, function (error) {
      if (error) console.error(error);
    });

    // Store encoding of QR code, eg to use as an image source
    this.qrURI = qrCanvas.toDataURL();

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
        connection.send({
          message: "Rejected",
          info: "Already connected to another client",
        });
        setTimeout(function () {
          connection.close();
        }, 500);
      });
      return;
    }
    this.conn = connection;
    console.log("Connection: ", connection);
    this.displayUpdate("[Connection established]", true);
    this.#ready();
  };
  #ready = () => {
    /*
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    // Perform callback with data
    this.conn.on("data", (data) => {
      data = data; // data = JSON.parse(data);
      console.log("Received data: ", data);
      switch (data.message) {
        case "Handshake":
          this.conn.send({
            message: "KeypadParameters",
            alphabet: this.alphabet,
            controlButtons: this.controlButtons,
            font: this.font,
            onErrorReconnectMessage: this.onErrorReconnectMessage,
          });
          this.onHandshake();
          break;
        case "Keypress":
          this.onData(data);
          break;
        // TODO factor out into keypadPeer
        case "Heartbeat":
          this.lastHeartbeat = performance.now();
          break;
        default:
          console.log("Message type: ", data.message);
      }
    });
    this.conn.on("close", () => {
      this.onClose();
      this.displayUpdate("Connection reset. Awaiting connection...");
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
