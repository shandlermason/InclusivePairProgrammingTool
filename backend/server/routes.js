/**
 * this file defines an express router as well as file paths that will
 * be utilized by the router
 */
const express = require('express');
const router = express.Router();
//imports routers defined in different files
const apiRouter = require('./api/APIRoutes');
const websocketRouter = require('./websocket/WebSocketRoutes');
const transcriptionRouter = require('./recognitionModels/transcription');

//mounts files to be used by the router
router.use("/api", apiRouter);
router.use(websocketRouter);
router.use(transcriptionRouter);

//router object is to be returned with .requires call
module.exports = router;