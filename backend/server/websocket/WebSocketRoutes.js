//establishes websocket connection, connecting to the database with TCPs
const express = require('express');
const axios = require('axios');
const websocketRouter = express.Router();

var userIDs = [];
var userPairs = {};
var pairings = {};
var connections = {};
var extensionIDs = [];
var extensionPairs = {};
var extensionConnections = {};
var sessionStatus = {};

/******************\
* WEBSOCKET ROUTES *
\******************/
websocketRouter.ws('/extension/ws', (ws, req) => {
  sendPacket(ws, {action: "hello"});
  ws.on('message', (msg) => {
    const message = JSON.parse(msg);
    switch (message.action) {
      case "hello":
        console.log("Said hello");
        break;
      case "extensionId":
        let extensionId = message.eid;
        if (extensionConnections[extensionId] === undefined) {
          extensionConnections[extensionId] = [ws];
        } else if (extensionConnections[extensionId].length < 2) {
          extensionConnections[extensionId][1] = ws;
        }
        if (!(extensionId in extensionIDs)) {
          extensionIDs.push(extensionId);
        }
        sendPacket(ws, { action: "registered", id: extensionId });
        if (extensionPairs[extensionId] !== undefined && sessionStatus[extensionId] !== 'CLOSED') {
          sessionStatus[extensionId] = 'ACTIVE';
          sendPacket(ws, { action: "paired", id: extensionPairs[extensionId]});
          if (extensionPairs[extensionId] in pairings) {
            var partnerId = pairings[extensionPairs[extensionId]];
            sendPacket(ws, { action: "start", partnerId: partnerId});
          } 
        } else if (extensionPairs[extensionId] !== undefined && sessionStatus[extensionId] === 'CLOSED') {
          var partnerId = pairings[extensionPairs[extensionId]];
          sendPacket(ws, { action: "paired", id: extensionPairs[extensionId]});
          sendPacket(ws, { action: "close", partnerId: partnerId, id: extensionPairs[extensionId]});
        }
        break;
      case "keepalive":
        sendPacket(ws, {action: "keepalive"});
        break;
      case "close":
        sessionStatus[message.eid] = 'CLOSED';
        // send to app
        if (connections[message.id]) {
          connections[message.id].forEach((ws) => {
            sendPacket(ws, {action: "close"});
          })
        }
        // send to partner
        if (connections[pairings[message.id]]) {
          connections[pairings[message.id]].forEach((ws) => {
            sendPacket(ws, {action: "close"});
          })
        }
        // send to partner's extension 
        sessionStatus[userPairs[pairings[message.id]]] = 'CLOSED';
        console.log("Sending closed message to partner.");
        if (extensionConnections[userPairs[pairings[message.id]]] !== undefined) {
          extensionConnections[userPairs[pairings[message.id]]].forEach((ws) => {
            sendPacket(ws, {action: "close", id: pairings[message.id], partnerId: message.id});
          })
        }

        // send to self (for LOC)
        if (extensionConnections[message.eid] !== undefined) {
          extensionConnections[message.eid].forEach((ws) => {
            sendPacket(ws, {action: "close", id: message.id, partnerId: pairings[message.id]});
          })
        }
        break;
      case "loc":
        var lineCount = message.count;
        var id = message.id;
        axios.put(`${process.env.API_URL}/users/${id}/linesOfCode/${lineCount}`).catch((err) => {
          console.log(err);
        })
        break; 
      case "clear":
        var eid = message.eid;
        var id = message.id;
        extensionConnections[eid].forEach((ws) => {
          sendPacket(ws, {action: "clear"})
        })
        // Clear user (app) information
        if (userIDs.indexOf(id) >= 0) {
          userIDs.splice(userIDs.indexOf(id), 1);
        }
        delete sessionStatus[eid];
        delete userPairs[id];
        delete pairings[id];
        delete connections[id];
        // Clear extension information
        if (extensionIDs.indexOf(eid) >= 0) {
          extensionIDs.splice(extensionIDs.indexOf(eid), 1);
        }
        delete extensionPairs[eid];
        delete extensionConnections[eid];
        // Check if other extension is gone (+ clear any other information)
        break;
    }
  });
})

websocketRouter.ws('/ws', (ws, req) => {
  sendPacket(ws, {action: "hello"});
  ws.on('message', (msg) => {
    const message = JSON.parse(msg);
    switch (message.action) {
      case "hello":
        console.log("Said hello");
        break;
      case "id":
        console.log("registering an id");
        let id = message.id;
        let eid = message.eid;
        if (connections[id] === undefined) {
          connections[id] = [ws];
        }
          
        if (id in userIDs) {
          sendPacket(ws, { action: "error", reason: "Id Already Exists"})
        } else {
          userIDs.push(id);
          extensionPairs[eid] = id;
          userPairs[id] = eid;
          sendPacket(ws, {action: "registered", id: id});
          // Send the userID to the extension
          let pairedExtension = Object.keys(extensionPairs).find(key => extensionPairs[key] === id);
          if (pairedExtension !== undefined && extensionConnections[pairedExtension] !== undefined) {
            extensionConnections[pairedExtension].forEach((ws) => {
              sendPacket(ws, {action: "paired", id: id});
            })
            // sendPacket(extensionConnections[pairedExtension], { action: "paired", id: id});
          }
        }

        break;
      case "pair":
        console.log("WS: Client " + message.id1 + " is trying to pair with Client " + message.id2);

        let returns = pair(message.id1, message.id2);
    
        if (returns.worked) {
          sendPacket(ws, {action: "start", partnerId: message.id2});
          // sendPacket()
              
          // send 
          if (!(connections[message.id2] === undefined)) {
            connections[message.id2].forEach((ws) => {
              sendPacket(ws, {action: "start", partnerId: message.id1});
              if (extensionConnections[userPairs[message.id2]] !== undefined) {
                extensionConnections[userPairs[message.id2]].forEach((ws) => {
                  sendPacket(ws, { action: "start", partnerId: message.id1});
                })
              }
            })
            var partnerId = message.id2;
            if (extensionConnections[userPairs[message.id1]] !== undefined) {
              extensionConnections[userPairs[message.id1]].forEach((ws) => {
                sendPacket(ws, { action: "start", partnerId: partnerId});
              })
            }
          }
                
        } else {
          sendPacket(ws, {action: "error", reason: returns.message});
        }

        break;
      case "close":
          // Send to partner
          if (connections[pairings[message.id]]) {
            connections[pairings[message.id]].forEach((ws) => {
              sendPacket(ws, {action: "close"});
            });
          }
          // Send to extension
          sessionStatus[message.eid] = 'CLOSED'
          if (extensionConnections[message.eid]) {
            extensionConnections[message.eid].forEach((ws) => {
              sendPacket(ws, {action: "close", id: message.id, partnerId: pairings[message.id]});
            })
          }
          // Send to partner's extension 
          sessionStatus[userPairs[pairings[message.id]]] = 'CLOSED';
          if (extensionConnections[userPairs[pairings[message.id]]] !== undefined) {
            extensionConnections[userPairs[pairings[message.id]]].forEach((ws) => {
              sendPacket(ws, {action: "close", id: pairings[message.id], partnerId: message.id});
            })
          }
        break;
      case "keepalive":
        sendPacket(ws, {action: "keepalive"});
        break;
      case "extensionId":
        let extensionId = message.eID;
        if (extensionConnections[extensionId] === undefined) {
          extensionConnections[extensionId] = [ws];
        }
        if (!(extensionId in extensionIDs)) {
          extenionIDs.push(extensionId);
        }
        sendPacket(ws, { action: "registered", id: extensionId });
        if (extensionPairs[extensionId] !== undefined) {
          sendPacket(ws, { action: "paired", id: extensionPairs[extensionId]});
        } 
        break;
    }
  });
  

  ws.on('close', e => {
    // closed(ws);
    console.log('client closed');
  });

});


function sendPacket(ws, data) {
  ws.send(JSON.stringify(data));
}

function pair(uid1, uid2) {
  let validPair = true;
  let msg = "";
  if (uid1 in pairings || uid2 in pairings) {
    msg = "One or both partners is already paired.";
    console.log("WS: " + msg);
    validPair = false;
  } else if (!(userIDs.includes(uid1)) || !(userIDs.includes(uid2))) {
    msg = "One or both partners has not registered yet.";
    console.log("WS: " + msg);
    validPair = false;
  } else {
    msg = "success";
    pairings[uid1] = uid2;
    pairings[uid2] = uid1;
  }
  return { 'worked': validPair, 'message': msg };
}

module.exports = websocketRouter;