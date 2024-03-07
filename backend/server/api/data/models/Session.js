const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
    user1_id: String,
    user2_id: String
});

module.exports = mongoose.model("Session", sessionSchema);