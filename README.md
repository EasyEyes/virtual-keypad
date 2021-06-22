# Virtual Keypad Receiver

Spawn and communicate with a virtual keypad, eg for use in online psychology 
experiments. 

This client-side module creates a QR Code linking to the appropriately 
specified keypad, handle's a user-defined callback on the incoming data,
and allows for real-time changes to the keypad content.

## How
TODO

## What
A simple (optionally self-hosted) keypad webapp, with user-specified callback behavior.
Built using [PeerJS](https://www.npmjs.com/package/peerjs) and [QRCode](https://www.npmjs.com/package/qrcode).

## Why
In [Denis Pelli's NYU psychology lab](https://denispelli.com), 
we carry out a lot of psychophysical experiments. For example,
we may want to 
[measure a participant's crowding](https://www.biorxiv.org/content/10.1101/2021.04.12.439570v1), 
so we can investigate the possibility of a 
[link between crowding performance and the size of the participants hV4](https://jov.arvojournals.org/article.aspx?articleid=2749904) region of the visual cortex.
These experiments often involve the participant responding to stimuli
with a keypress. If the task requires a long viewing distance, a
wireless keyboard is provided to the participant, so they can respond
when positioned further than an arm's length away from the experiment computer.

Increasingly so, these types of experiments are being run remotely, 
in participants' homes, by participants recruited on platforms such as
[MTurk](https://en.wikipedia.org/wiki/Criticism_of_Amazon) 
or [Prolific](https://www.prolific.co). 
Under the presumption that smartphones are more
generally available than wireless, Bluetooth keyboards, this utlility
emulates a wireless keyboard on any internet-connected smartphone.
