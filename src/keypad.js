import "./keypad.css";
import "./Pelli/PelliFont.css";
import "./Sloan/SloanFont.css";
import { KeypadPeer } from "./keypadPeer.js";

class Keypad extends KeypadPeer {
  constructor(
    keypadParameters = {
      keypadUrl: "https://www.keypad.website/keypad?",
      targetElementId: null,
      visualResponseFeedback: false,
    }
  ) {
    super({
      keypadUrl: keypadParameters.keypadUrl,
      targetElementId: keypadParameters.targetElementId,
    });
    this.startTime = Date.now();
    this.receiverPeerId = null;

    const parametersFromURL = this.parseParams(
      new URLSearchParams(window.location.search)
    );
    this.alphabet = this.checkAlphabet(parametersFromURL.alphabet);
    this.font = parametersFromURL.font;
    this.receiverPeerId = parametersFromURL.peerId;
    this.visualResponseFeedback = keypadParameters.visualResponseFeedback;

    // Set-up sound to play on press
    this.pressFeedback = new Audio(this.keypressFeedbackSound);

    this.peer.on("open", this.#onPeerOpen);
    this.peer.on("connection", this.#onPeerConnection);
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
  #onPeerConnection = (connection) => {
    // Disallow incoming connections
    connection.on("open", function () {
      connection.send("Sender does not accept incoming connections");
      setTimeout(function () {
        connection.close();
      }, 500);
    });
  };
  #onConnData = (data) => {
    console.log("Data received: ", data);
    // Keypad has received data, namely instructions to update the keypad
    if ((!data.hasOwnProperty("alphabet") && !data.hasOwnProperty("font")) || (!data.hasOwnProperty("peerID"))) {
      console.error(
        'Error in parsing data received! Must set "alphabet" or "font" properties, and "peerID" property.'
      );
    } else {
      this.conn.close();
      /*
      this.alphabet = data.hasOwnProperty("alphabet")
        ? this.checkAlphabet(data["alphabet"])
        : this.alphabet;
      this.font = data.hasOwnProperty("font") ? data["font"] : this.font;
      */
      let newParams = {
        alphabet: data.alphabet,
        font: data.font,
        peerID: data.peerID,
      };
      /*
      FUTURE does this limit usable environments?
      ie does this work if internet is lost after initial page load?
      */
      window.location.search = this.queryStringFromObject(newParams); // Redirect to correctly constructed keypad page
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
    this.conn.on("open", this.#populateKeypad);
    // Handle incoming data (messages only since this is the signal sender)
    this.conn.on("data", this.#onConnData);
    this.conn.on("close", function () {
      console.log("Connection closed");
    });
  };
  #prepareHTML = () => {
    const keypadElem = document.createElement("div");
    keypadElem.setAttribute("id", "keypad");
    const keypadHeader = document.createElement("div");
    keypadHeader.setAttribute("id", "keypad-header");
    keypadElem.appendChild(keypadHeader);
    if (document.getElementById(this.targetElement)) {
      console.log("Specified target element successfully used.");
      document.getElementById(this.targetElement).appendChild(keypadElem);
    } else {
      console.log("No target element used.");
      document.getElementsByTagName("main")[0].appendChild(keypadElem);
    }
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
        this.conn.send(JSON.stringify(message));
        console.log("Keypress sent: ", JSON.stringify(message));
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
      let button = document.createElement("a");
      button.id = symbol;
      button.className = "response-button";
      button.style.fontFamily = this.font;

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
        switch (e.toElement.className) {
          case "response-button-label noselect":
            buttonResponseFn(e.toElement.parentElement); // e.target.click();
            break;
          case "response-button":
            buttonResponseFn(e.toElement); // e.target.click();
            break;
        }
      });
      // ...send signal on release
      button.addEventListener("touchmove", (e) => {
        /* prevent delay and simulated mouse events */
        e.preventDefault();
        console.log("touchmove event: ", e);
      });
      button.addEventListener("touchend", (e) => {
        /* prevent delay and simulated mouse events */
        e.preventDefault();
        console.log("touchend event: ", e);
        const elementEndedOn = document.elementFromPoint(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
        console.log("elementEndedOn: ", elementEndedOn);
        console.log("elementEndedOn.className: ", elementEndedOn.className);
        switch (elementEndedOn.className) {
          case "response-button-label noselect":
            buttonResponseFn(elementEndedOn.parentElement); // e.target.click();
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
      document.querySelector("#keypad").appendChild(button);
    };

    // Set-up an instructio/welcome message for the user
    const header = document.getElementById("keypad-header");
    header.innerText = "Please respond by pressing a key.";
    // Get the keypad element
    const remoteControl = document.getElementById("keypad");

    // Set-up audio element
    const feedbackAudio = document.createElement("audio");
    feedbackAudio.id = "feedbackAudio";
    feedbackAudio.src = this.keypressFeedbackSound;
    header.appendChild(feedbackAudio);

    // Set correct font for button labels
    remoteControl.style.fontFamily = this.font;
    // Remove previous buttons
    remoteControl.innerHTML = "";
    // Create new buttons
    this.alphabet.forEach((symbol) => createButton(symbol));
  };
  visualFeedbackThenReset = (delayTime = 800) => {
    // ie grey out keys just after use, to discourage rapid response
    this.interResponseKeypadMessaging();
    // Setup keys for the next trial
    setTimeout(defaultKeypadMessaging, delayTime);
  };
  defaultKeypadMessaging = (
    headerText = "Please respond by pressing a key."
  ) => {
    // Set-up an instruction/welcome message for the user
    const header = document.getElementById("keypad-header");
    header.innerText = headerText;

    // Make each button pressable
    const buttons = document.getElementsByClassName("response-button");
    [...buttons].forEach((element) => {
      element.classList.remove("unpressable", "noselect");
    });
  };
  interResponseKeypadMessaging = (
    interResponseMessage = "Please fix your gaze on the + mark on your computer screen."
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
}

export { Keypad };
