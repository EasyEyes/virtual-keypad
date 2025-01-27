import { applyMaxKeySize } from "./maxKeySize";
import "./keypad.css";
import { KeypadPeer, keypadUrl } from "./keypadPeer.js";

class Keypad extends KeypadPeer {
  constructor(
    keypadParameters = {
      keypadUrl: keypadUrl,
      targetElementId: null,
      visualResponseFeedback: false,
    },
  ) {
    super({
      keypadUrl: keypadParameters.keypadUrl,
      targetElementId: keypadParameters.targetElementId,
    });
    this.startTime = Date.now();
    this.receiverPeerId = null;
    this.controlButtons = keypadParameters.controlButtons ?? ["SPACE", "RETURN"];

    const parametersFromURL = this.parseParams(
      new URLSearchParams(window.location.search),
    );
    // this.alphabet = this.checkAlphabet(parametersFromURL.alphabet);
    // this.font = parametersFromURL.font;
    this.receiverPeerId = parametersFromURL.peerId;
    // this.visualResponseFeedback = keypadParameters.visualResponseFeedback;

    // Set-up sound to play on press
    this.pressFeedback = new Audio(this.keypressFeedbackSound);

    this.peer.on("open", this.#onPeerOpen);
    this.peer.on("connection", this.#disallowIncomingConnections);
    this.peer.on("disconnected", this.onPeerDisconnected);
    this.peer.on("close", this.onPeerClose);
    this.peer.on("error", this.onPeerError);

    this.#prepareHTML();
  }
  #onPeerOpen = (id) => {
    // Workaround for peer.reconnect deleting previous id
    if (this.peer.id === null) {
      console.log("Received null id from peer open");
      this.peer.id = this.lastPeerId;
    } else {
      this.lastPeerId = this.peer.id;
    }
    this.#join();
  };
  #disallowIncomingConnections = (connection) => {
    connection.on("open", function () {
      connection.send({
        message: "Rejected",
        info: "Sender does not accept incoming connections",
      });
      setTimeout(function () {
        connection.close();
      }, 500);
    });
  };
  #onConnData = (data) => {
    console.log("Data received: ", data);
    data = data; // data = JSON.parse(data);
    switch (data.message) {
      case "KeypadParameters":
        this.alphabet = data.alphabet;
        this.font = data.font;
        this.controlButtons = data.controlButtons;
        this.onErrorReconnectMessage = data.onErrorReconnectMessage;
        this.#populateKeypad();
        break;
      case "UpdateHeader":
        document.getElementById("keypad-header").innerText = data.headerContent;
        document.getElementById("keypad-header").style.display =
          data.headerContent === "" ? "none" : "block";
        this.headerMessage = data.headerContent;
        this.#populateKeypad();
        break;
      case "UpdateFooter":
        document.getElementById("keypad-footer").innerText = data.headerContent;
        this.footerMessage = data.headerContent;
        this.#populateKeypad();
        break;
      case "Update":
        // Keypad has received data to update the keypad
        if (!data.hasOwnProperty("alphabet") && !data.hasOwnProperty("font") && !data.hasOwnProperty("controlButtons")) {
          console.error(
            'Error in parsing data received! Must set "alphabet" or "font" properties',
          );
        } else {
          this.alphabet = data.alphabet ?? this.alphabet;
          this.font = data.font ?? this.font;
          this.controlButtons = data.controlButtons ?? this.controlButtons;
        }
        this.#populateKeypad();
        break;
      case "Disable":
        if (data.hasOwnProperty("keys")) {
          // TODO check that data.keys is a list of strings, and "space" isn't ["s", "p", "a"...]
          this.disableKeys(data.keys);
        } else {
          this.disableKeys();
        }
        break;
      case "Enable":
        if (data.hasOwnProperty("keys")) {
          // TODO check that data.keys is a list of strings, and "space" isn't ["s", "p", "a"...]
          this.enableKeys(data.keys);
        } else {
          this.enableKeys();
        }
        break;
      // TODO factor out into keypadPeer
      case "Heartbeat":
        this.lastHeartbeat = performance.now();
        break;
      default:
        console.log("Message type: ", data.message);
    }
  };
  #join = () => {
    /**
     * Create the connection between the two Peers.
     *
     * Sets up callbacks that handle any events related to the
     * connection and data received on it.
     */
    // Close old connection
    if (this.conn) {
      this.conn.close();
    }
    // Create connection to destination peer specified by the query param
    this.conn = this.peer.connect(this.receiverPeerId, {
      reliable: true,
    });

    console.log("Connection: ", this.conn);
    this.conn.on("open", this.#initiateHandshake);
    // Handle incoming data (messages only since this is the signal sender)
    this.conn.on("data", this.#onConnData);
    // TODO figure out how to re-establish connection, or have more robust connection
    this.conn.on("close", () => console.log("Connection closed"));
  };
  #initiateHandshake = () => {
    this.conn.send({ message: "Handshake" });
    this._setupHeartBeatIntervals();
  };
  #prepareHTML = () => {
    /**
     * ----------
     * | Header |
     * ----------
     * |a b c d | <- keypad-keys
     * |e f g h |
     * |i j k l |
     * ----------
     * |space ret| <- keypad-control-keys
     */
    // Keypad elem is a container for a message and all keys
    const keypadElem = document.createElement("div");
    keypadElem.setAttribute("id", "keypad");
    const keypadHeader = document.createElement("h1");
    keypadHeader.setAttribute("id", "keypad-header");
    keypadHeader.classList.add("noselect");
    const keypadKeys = document.createElement("div");
    keypadKeys.setAttribute("id", "keypad-keys");
    keypadKeys.classList.add("keys");
    const keypadControlKeys = document.createElement("div");
    keypadControlKeys.setAttribute("id", "keypad-control-keys");
    keypadControlKeys.classList.add("keys");
    const keypadFooter = document.createElement("div");
    keypadFooter.setAttribute("id", "keypad-footer");
    keypadElem.appendChild(keypadHeader);
    keypadKeys.appendChild(keypadControlKeys);
    keypadElem.appendChild(keypadKeys);
    keypadElem.appendChild(keypadFooter);
    // Add keypad, ie container with header,keys,control keys to page where specified
    if (document.getElementById(this.targetElement)) {
      console.log("Specified target element successfully used.");
      document.getElementById(this.targetElement).appendChild(keypadElem);
    } else {
      console.log("No target element used.");
      document.getElementsByTagName("main")[0].appendChild(keypadElem);
    }
    // Close connection if window closes.
    window.onbeforeunload = () => {
      this.conn?.close();
      console.log("closing connection on page unload.");
    };
    window.onvisibilitychange = () => {
      this.conn?.close();
      console.log("closing connection on page unload.");
    };

    window.onresize = () => {
      console.count("Window resized.");
      applyMaxKeySize(this.alphabet?.length);
    };
    if (window.visualViewport) window.visualViewport.onresize = () => {
      console.count("VisualViewport resized.");
      applyMaxKeySize(this.alphabet?.length);
    };
  };
  #populateKeypad = () => {
    const buttonResponseFn = (button) => {
      // Send response message to experimentClient
      const message = {
        message: "Keypress",
        sendId: this.peer.id,
        recvId: this.conn.peer,
        response: button.id,
        timeSent: Date.now(),
        elapsedStartToSend: Date.now() - window.startTime,
      };
      /**
       * Send a signal via the peer connection to indicate keypress.
       * This will only occur if the connection is still alive.
       */
      if (this.conn && this.conn.open) {
        this.conn.send(message); // this.conn.send(JSON.stringify(message));
        // console.log("Keypress sent: ", JSON.stringify(message));
        console.log("Keypress sent: ", message);
      } else {
        console.log("Connection is closed");
      }

      // Update keypad after a period of visible non-responsivity (ie ITI)
      if (this.visualResponseFeedback) {
        this.visualFeedbackThenReset(alphabet, font);
      }
    };
    const createButton = (symbol) => {
      // Create a response button for this symbol
      let button = document.createElement("button");
      button.id = symbol;
      button.className = "response-button";
      button.style.fontFamily = this.font;
      button.style.visibility = "hidden";

      const feedbackAudio = document.getElementById("feedbackAudio");

      /* Set behavior for press */
      // Sound on press...
      button.addEventListener("touchstart", (e) => {
        e.preventDefault();
        console.log("touchstart event: ", e);
        feedbackAudio.play();
      });
      button.addEventListener("mousedown", (e) => {
        e.preventDefault();
        feedbackAudio.play();
      });
      button.addEventListener("mouseup", (e) => {
        e.preventDefault();
        console.log("mouseup event: ", e);
        switch (e.target.className) {
          case "response-button-label noselect":
            buttonResponseFn(e.target.parentElement);
            break;
          case "response-button":
            buttonResponseFn(e.target);
            break;
        }
      });
      // ...send signal on release
      button.addEventListener("touchmove", (e) => {
        /* prevent delay and simulated mouse events */
        e.preventDefault();
      });
      button.addEventListener("touchend", (e) => {
        /* prevent delay and simulated mouse events */
        e.preventDefault();
        const elementEndedOn = document.elementFromPoint(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY,
        );
        switch (elementEndedOn?.className) {
          case "response-button-label noselect":
            buttonResponseFn(elementEndedOn?.parentElement); // e.target.click();
            break;
          case "response-button":
            buttonResponseFn(elementEndedOn); // e.target.click();
            break;
        }
      });

      // Create a label for the button
      let buttonLabel = document.createElement("span");
      buttonLabel.classList.add("response-button-label", "noselect");
      buttonLabel.innerText = symbol;
      buttonLabel.style.fontFamily = this.font;

      // Add the label to the button
      button.appendChild(buttonLabel);
      // Add the labeled-button to the HTML
      if (this.controlButtons.map(x => x.toLowerCase()).includes(symbol.toLowerCase())) {
        document.querySelector("#keypad-control-keys").appendChild(button);
      } else {
        document.querySelector("#keypad-keys").appendChild(button);
      }
    };

    // Set-up an instruction/welcome message for the user
    const header = document.getElementById("keypad-header");
    header.innerText = this.headerMessage || "";
    header.style.display = header.innerText === "" ? "none" : "block";
    // Get the keypad element
    const remoteControl = document.getElementById("keypad");

    // Set-up audio element
    const feedbackAudio = document.createElement("audio");
    // TODO investigate why feedback audio is broken/unreliable
    feedbackAudio.id = "feedbackAudio";
    feedbackAudio.src = "onems.mp3";
    header.appendChild(feedbackAudio);

    // Set correct font for button labels
    remoteControl.style.fontFamily = this.font;
    // Remove previous buttons
    this.clearKeys();
    // Create new buttons
    this.alphabet.forEach((symbol) => createButton(symbol));
    // Manually style buttons, according to Denis' algorithm
    setTimeout(() => applyMaxKeySize(this.alphabet.length), 5); // Why?
  };
  visualFeedbackThenReset = (delayTime = 800) => {
    // ie grey out keys just after use, to discourage rapid response
    this.interResponseKeypadMessaging();
    // Setup keys for the next trial
    setTimeout(defaultKeypadMessaging, delayTime);
  };
  defaultKeypadMessaging = (headerText = "") => {
    // Set-up an instruction/welcome message for the user
    const header = document.getElementById("keypad-header");
    if (headerText === "") {
      header.style.display = "none";
    } else {
      header.innerText = headerText;
      header.style.display = "block";
    }

    // Make each button pressable
    const buttons = document.getElementsByClassName("response-button");
    [...buttons].forEach((element) => {
      element.classList.remove("unpressable", "noselect");
    });
  };
  interResponseKeypadMessaging = (
    interResponseMessage = "Please fix your gaze on the + mark on your computer screen.",
  ) => {
    // Change header text to reflect WAIT message
    const header = document.getElementById("keypad-header");
    header.innerText = interResponseMessage;

    // Then make each button unpressable
    const buttons = document.getElementsByClassName("response-button");
    [...buttons].forEach((element) => {
      element.classList.add("unpressable", "noselect");
    });
  };
  /**
   * Remove all keys from the keypad.
   */
  clearKeys = () => {
    document.querySelector("#keypad-keys").innerHTML =
      "<div id='keypad-control-keys'></div>";
    // document.querySelector("#keypad-control-keys").innerHTML = "";
  };
  /**
   * Return the nodes corresponding to the specified keys.
   * @param {string[]} whichKeys id's of keys to select. defaults to all keys.
   * @returns {HTMLElement[]}
   */
  _getKeysElements = (whichKeys = []) => {
    let keyElems = [
      ...document
        .querySelector("#keypad")
        .getElementsByClassName("response-button"),
    ];
    if (whichKeys.length !== 0)
      keyElems = keyElems.filter((e) => whichKeys.includes(e.id));
    return keyElems;
  };
  /**
   * Make selected keys unpressable.
   */
  disableKeys = (whichKeys = []) => {
    const keyElems = this._getKeysElements(whichKeys);
    keyElems.forEach((e) => {
      e.classList.add("unpressable");
      e.classList.add("noselect");
      e.setAttribute("inert", "");
    });
  };
  /**
   * Make selected keys pressable.
   */
  enableKeys = (whichKeys = []) => {
    const keyElems = this._getKeysElements(whichKeys);
    keyElems.forEach((e) => {
      e.classList.remove("unpressable");
      e.classList.remove("noselect");
      e.removeAttribute("inert");
    });
  };
}

export { Keypad };
