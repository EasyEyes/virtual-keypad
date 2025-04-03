const doNothing = () => undefined;
export class ExperimentPeer {
  constructor(
    keypadParameters,
    onDataCallback = doNothing,
    handshakeCallback = doNothing,
    customConnectionCallback = doNothing,
    customCloseCallback = doNothing,
    customErrorCallback = doNothing,
    connectionManager = null
  ) {
    keypadParameters = this.verifyKeypadParameters(keypadParameters);
    this.alphabet = this.checkAlphabet(keypadParameters.alphabet);
    this.font = keypadParameters.font;
    this.controlButtons = keypadParameters.controlButtons;
    this.onErrorReconnectMessage =
      keypadParameters.onErrorReconnectMessage ??
      "Connection lost. Please reconnect...";
    this.targetElementId = keypadParameters.targetElementId;
    this.onData = onDataCallback;
    this.onHandshake = () => {
      handshakeCallback();
      //   this._setupHeartBeatIntervals();
    };
    this.connectionManager = connectionManager;
    this.name = "keypad";
    this.lastHeartbeat = performance.now();
    this.heartBeatInterval = undefined;
    this.heartCheckInterval = undefined;
  }

  verifyKeypadParameters(keypadParameters) {
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
      // TODO necessary to check control buttons?
    }
    return keypadParameters;
  }
  checkAlphabet = (proposedAlphabet) => {
    let validAlphabet;
    if (Array.isArray(proposedAlphabet)) {
      // ARRAY : good
      // FUTURE verify that symbols are displayable in desired font
      validAlphabet = proposedAlphabet;
    } else if (typeof proposedAlphabet == "string") {
      // STRING : ok
      if (
        proposedAlphabet.toUpperCase() === "SPACE" ||
        proposedAlphabet.toUpperCase() == "RETURN"
      ) {
        validAlphabet = [proposedAlphabet];
      } else {
        validAlphabet = proposedAlphabet.split("");
      }
    } else {
      // SOMETHING ELSE : bad
      console.error(
        "Error! Alphabet must be specified as an array of symbols, including 'RETURN', 'SPACE'"
      );
      validAlphabet = [];
    }
    // Return unique elements, see: https://stackoverflow.com/questions/11246758/how-to-get-unique-values-in-an-array
    const uniqueValidAlphabet = [...new Set(validAlphabet)];

    // Order alphabet so that if 'SPACE' and 'RETURN' are in the list, they are correctly positioned
    if ("SPACE" in uniqueValidAlphabet) {
      uniqueValidAlphabet = moveElementToEndOfArray(
        uniqueValidAlphabet,
        "SPACE"
      );
    }
    if ("RETURN" in uniqueValidAlphabet) {
      uniqueValidAlphabet = moveElementToEndOfArray(
        uniqueValidAlphabet,
        "RETURN"
      );
    }
    return uniqueValidAlphabet;
  };
  _setupHeartBeatIntervals = () => {
    this.heartBeatInterval = setInterval(
      () =>
        this.connectionManager?.send({ message: "Heartbeat", type: this.name }),
      this.heartbeatIntervalMs
    );

    this.heartCheckInterval = setInterval(() => {
      const timeSinceHeartbeatMs = performance.now() - this.lastHeartbeat;
      if (timeSinceHeartbeatMs > this.ttd) {
        console.log("Closing connection due to lack of heartbeat.");
        this.connectionManager?.close();
        this.connectionManager = undefined;
        clearInterval(this.heartBeatInterval);
        clearInterval(this.heartCheckInterval);
        this.heartBeatInterval = undefined;
        this.heartCheckInterval = undefined;
      }
    }, this.ttd);
  };

  update = (
    alphabet = undefined,
    font = undefined,
    controlButtons = undefined
  ) => {
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

    this.controlButtons = controlButtons ?? this.controlButtons;

    // Update keypad
    try {
      this.connectionManager?.send({
        type: this.name,
        message: "Update",
        alphabet: this.alphabet,
        font: this.font,
        peerID: this.connectionManager?.peer.id,
        controlButtons: this.controlButtons,
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
      type: this.name,
    };
    if (whichKeys) message.keys = whichKeys;
    try {
      this.connectionManager?.send(message);
    } catch (e) {
      this.displayUpdate(`Error disabling keys. Keys: ${whichKeys}`);
      console.error(e);
    }
  };

  enableKeys = (whichKeys = undefined) => {
    const message = {
      message: "Enable",
      type: this.name,
    };
    if (whichKeys) message.keys = whichKeys;
    try {
      this.connectionManager?.send(message);
    } catch (e) {
      this.displayUpdate(`Error enabling keys. Keys: ${whichKeys}`);
      console.error(e);
    }
  };

  updateDisplayMessage = (message) => {
    try {
      this.connectionManager?.send({
        type: this.name,
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
      this.connectionManager?.send({
        type: this.name,
        message: "UpdateFooter",
        headerContent: message,
      });
    } catch (e) {
      this.displayUpdate("Error in updating footer message."); // Debug
      console.error(e);
    }
  };

  onMessage = (data) => {
    if (!data || !data.message) return;
    switch (data.message) {
      case "Handshake":
        this.connectionManager?.send({
          type: this.name,
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
      case "HeartRate":
        this.heartbeatIntervalMs = data.heartbeatIntervalMs;
        break;
      default:
        console.log("Message type: ", data.message);
    }
  };

  displayUpdate = (message, append = false) => {
    // If the specified elem exists, update that elem
    if (!!document.getElementById(this.targetElement)) {
      const displayElement = document.getElementById(this.targetElement);
      if (append) {
        const oldInnerText = displayElement.innerText;
        displayElement.innerText = message + "\n" + oldInnerText;
      } else {
        displayElement.innerText = message;
      }
    } else {
      console.log("MESSAGE: ", message);
    }
  };

  initializeKeypad = () => {
    console.log("Initializing keypad");
    this._setupHeartBeatIntervals();
    //send message to receiver to initialize keypad
    this.connectionManager?.send({
      message: "InitializeKeypad",
      type: this.name,
    });
  };
}

const moveElementToEndOfArray = (array, element) => {
  return [
    ...array.slice(0, array.indexOf(element)),
    ...array.slice(array.indexOf(element) + 1),
    element,
  ];
};
