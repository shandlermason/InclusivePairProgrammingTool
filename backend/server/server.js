/**
This file initializes the server by establishing a p2p network connection
*/

//initializes express and an https server -> aka, establishes that there will be a network connection
const express = require('express');
//peer package, establishes p2p connections
const { ExpressPeerServer, PeerServer} = require("peer");

//cors = security so program cannot access different http domain
var cors = require('cors');

//parases incoming request bodies, or http requests/messages
//in other words, listens for data being sent over database
var bodyParser = require("body-parser");
const app = express(); 
const server = require('http').Server(app)
app.use(bodyParser.json());

//if NODE_ENV isnt test, connect to mongo w/ mongoose
if (process.env.NODE_ENV !== 'test') {
    require('./api/data/DB.js');
}
  
//utilization of cors
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

//ensures file is available when using .require()
module.exports = app;

