const mongoose = require('mongoose');
const { Schema } = mongoose;

const utteranceSchema = new Schema ({
    user_id: String,
    start_time: Number,  
    end_time: Number,
    transcript: String
});

module.exports = mongoose.model("Utterance", utteranceSchema);

//data storage format of "Utterance"
