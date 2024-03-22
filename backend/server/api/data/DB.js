/**
This file connects to mongo db network using .env parameters
*/

const mongoose = require('mongoose');
require("dotenv").config();

//connect to mongo using specified variables, mongoose
const connectToMongoDB = async () => {
    try {

        // Connect to the MongoDb database that is running on the NCSU VM

        mongoose.connect(`${process.env.MONGODB_URI}${process.env.MONGO_INITDB_DATABASE}`, {
            auth: {
                username: process.env.MONGO_USER,
                password: process.env.MONGO_PASSWORD,
              },
        }).then(
            () => { 
                console.log("Connected to DB!");
            },
            err => { 
                console.log(err);
            }
        );

        mongoose.connection.on('open', function(){
            console.log("Connection to Mongo DB is open!");
        });
    } catch (err) {
        console.log("Failed to connect to db");
    }
}

connectToMongoDB();