const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema({
    user_id: String,
    primary_communication: String,
    leadership_style: String,
    communication_style: String,
    self_efficacy_level: String
});

module.exports = mongoose.model("Report", reportSchema);

//data storage format of "Report"
