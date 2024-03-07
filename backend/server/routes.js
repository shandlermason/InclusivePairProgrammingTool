//defines routes

const express = require('express');
const router = express.Router();
//connects routes to different files
const apiRouter = require('./api/APIRoutes');
const websocketRouter = require('./websocket/WebSocketRoutes');
const transcriptionRouter = require('./recognitionModels/transcription');

//mounts files to be used by the router
//second two files are to be used at root directory
router.use("/api", apiRouter);
router.use(websocketRouter);
router.use(transcriptionRouter);

//router object is to be returned with .requires call
module.exports = router;