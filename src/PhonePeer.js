import { applyMaxKeySize } from "./maxKeySize";
import "./keypad.css";

class PhonePeer {
  constructor(
    keypadParameters = {
      targetElementId: null,
      visualResponseFeedback: false,
    }
  ) {
    // Module identification
    this.name = "keypad";
    this.type = "keypad";
    this.connectionManager = null;

    console.log("targetElementId: ", keypadParameters.targetElementId);

    // Keypad configuration
    this.startTime = Date.now();
    this.targetElement = keypadParameters.targetElementId;
    this.controlButtons = keypadParameters.controlButtons ?? [
      "SPACE",
      "RETURN",
    ];
    this.visualResponseFeedback = keypadParameters.visualResponseFeedback;
    this.alphabet = null;
    this.font = null;
    this.headerMessage = "";
    this.footerMessage = "";

    // Set-up sound to play on press
    this.pressFeedback = new Audio(this.keypressFeedbackSound);
  }

  // Required method for ConnectAPeer submodule registration
  register = (manager) => {
    this.connectionManager = manager;
    console.log("Keypad module registered with connection manager");
  };

  // Required method for ConnectAPeer message handling
  onMessage = (data, manager) => {
    console.log("Keypad received data: ", data);

    if (!data || !data.message) return;

    switch (data.message) {
      case "KeypadParameters":
        this.alphabet = data.alphabet;
        this.font = data.font;
        this.controlButtons = data.controlButtons;
        this.onErrorReconnectMessage = data.onErrorReconnectMessage;
        this.initializeKeypad();
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
        if (
          !data.hasOwnProperty("alphabet") &&
          !data.hasOwnProperty("font") &&
          !data.hasOwnProperty("controlButtons")
        ) {
          console.error(
            'Error in parsing data received! Must set "alphabet" or "font" properties'
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
          this.disableKeys(data.keys);
        } else {
          this.disableKeys();
        }
        break;
      case "Enable":
        if (data.hasOwnProperty("keys")) {
          this.enableKeys(data.keys);
        } else {
          this.enableKeys();
        }
        break;
      case "Heartbeat":
        this.lastHeartbeat = performance.now();
        break;
      case "InitializeKeypad":
        this.initializeKeypad();
        break;
      default:
        console.log("Unhandled message type: ", data.message);
    }
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

    // Add keypad to page where specified
    if (document.getElementById(this.targetElement)) {
      console.log("Specified target element successfully used.");
      const targetElement = document.getElementById(this.targetElement);
      targetElement.innerHTML = "";
      targetElement.appendChild(keypadElem);
    } else {
      console.log("No target element used.");
      document.getElementsByTagName("main")[0].appendChild(keypadElem);
    }

    window.onresize = () => {
      console.count("Window resized.");
      applyMaxKeySize(this.alphabet?.length);
    };
    if (window.visualViewport)
      window.visualViewport.onresize = () => {
        console.count("VisualViewport resized.");
        applyMaxKeySize(this.alphabet?.length);
      };
  };

  #populateKeypad = () => {
    const buttonResponseFn = (button) => {
      // Send response message to experimentClient
      const message = {
        type: "keypad", // Add type for ConnectAPeer routing
        message: "Keypress",
        response: button.id,
        timeSent: Date.now(),
        elapsedStartToSend: Date.now() - window.startTime,
      };

      // Send the keypress through the connection manager
      if (this.connectionManager) {
        this.connectionManager.send(message);
        console.log("Keypress sent: ", message);
      } else {
        console.log("Connection manager not available");
      }

      // Update keypad after a period of visible non-responsivity (ie ITI)
      if (this.visualResponseFeedback) {
        this.visualFeedbackThenReset(this.alphabet, this.font);
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
          e.changedTouches[0].clientY
        );
        switch (elementEndedOn?.className) {
          case "response-button-label noselect":
            buttonResponseFn(elementEndedOn?.parentElement);
            break;
          case "response-button":
            buttonResponseFn(elementEndedOn);
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
      if (
        this.controlButtons
          .map((x) => x.toLowerCase())
          .includes(symbol.toLowerCase())
      ) {
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
    feedbackAudio.id = "feedbackAudio";
    feedbackAudio.src = "onems.mp3";
    header.appendChild(feedbackAudio);

    // Set correct font for button labels
    remoteControl.style.fontFamily = this.font;
    // Remove previous buttons
    this.clearKeys();
    // Create new buttons
    if (this.alphabet) {
      this.alphabet.forEach((symbol) => createButton(symbol));
      // Manually style buttons, according to Denis' algorithm
      setTimeout(() => applyMaxKeySize(this.alphabet.length), 5);
    }
  };

  visualFeedbackThenReset = (delayTime = 800) => {
    // ie grey out keys just after use, to discourage rapid response
    this.interResponseKeypadMessaging();
    // Setup keys for the next trial
    setTimeout(() => this.defaultKeypadMessaging(), delayTime);
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

  /**
   * Remove all keys from the keypad.
   */
  clearKeys = () => {
    document.querySelector("#keypad-keys").innerHTML =
      "<div id='keypad-control-keys'></div>";
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

  /**
   * Initialize the keypad DOM elements and set up event listeners.
   * Call this method when you're ready to display the keypad.
   */
  initializeKeypad() {
    this.#prepareHTML();
  }
}

async function main() {
  const pp = new PhonePeer({
    targetElementId: "target",
  });

  if (window.phoneApp) {
    window.phoneApp.registerSubmodule(pp);
  } else {
    console.log("PhoneApp not found");
  }
}

main().catch((err) => console.error(err));
