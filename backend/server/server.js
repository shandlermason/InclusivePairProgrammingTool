//initializes express and an https server -> aka, establishes that there will be a network connection
const express = require('express');
const { ExpressPeerServer, PeerServer} = require("peer");

var cors = require('cors');
var bodyParser = require("body-parser");
const app = express(); 
const server = require('http').Server(app)
app.use(bodyParser.json());

//if NODE_ENV isnt test, connect to mongo w/ mongoose
if (process.env.NODE_ENV !== 'test') {
    require('./api/data/DB.js');
}
  
app.use(cors());

//WebSockets
const expressWs = require('express-ws')(app);

//introduces routes
const routes = require('./routes.js');
app.use(routes);

const peerServer = PeerServer({ port: 4000, path: "/myapp" });

// Denotes that the server is listening for incoming connections
const PORT = 3000;
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
module.exports = app;