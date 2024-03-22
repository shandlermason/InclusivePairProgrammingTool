const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    user_id: String,
    lines_of_code: Number,
    num_role_changes: Number,
    expression_scores: [Number],
    num_interruptions: Number,
    num_utterances: Number   
});

module.exports = mongoose.model("User", userSchema);

//data storage format of "User"
