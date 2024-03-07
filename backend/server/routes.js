//defines routes

const express = require('express');
const router = express.Router();

const apiRouter = require('./api/APIRoutes');
const websocketRouter = require('./websocket/WebSocketRoutes');
const transcriptionRouter = require('./recognitionModels/transcription');

router.use("/api", apiRouter);
router.use(websocketRouter);
router.use(transcriptionRouter);

module.exports = router;