const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

var app = (module.exports = express());
var server = "http://localhost:3000";

// I got an error with line below if I didnt' add the extended property
// Don't actually know if this should be set to true or false.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

// Middleware to check we have all the params we need
const checkParams = (req, res, next) => {
  let noID = !req.query.hasOwnProperty('peerID');
  if (noID) { 
    console.log('No peerID given.');  // TODO Breaking! Serve error
    req.query.peerID = uuidv4(); // TEMPorary and only usable to test keypadClient
  }

  // TODO check that all characters can be input as query params
  const noAlphabet = !req.query.hasOwnProperty('alphabet');
  if (noAlphabet) {
    console.log('No alphabet given.');
    req.query.alphabet = 'ABCDEFG';
  }

  // TODO check for valid fonts here
  let noFont = !req.query.hasOwnProperty('font');
  if (noFont) {
    console.log('No alphabet given.');
    req.query.font = 'Sloan';
  }
  next();
};

// Link to the actual keypad
// ie this is where the user will be sent (from the QR code) on their phone
app.get('/keypad', checkParams, function (req, res) {
  res.render(path.join(__dirname, '/example', 'keypad.html'));
});
app.get('/receiver', function (req, res) {
  res.render(path.join(__dirname, '/example', 'receiver.html'));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    error: err.message
  });
});

app.use(function (req, res) {
  res.status(404);
  res.send({
    error: "404 not found"
  });
});

if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
