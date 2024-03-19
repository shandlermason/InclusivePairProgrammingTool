const express = require('express');
const apiRouter = express.Router();
apiRouter.use(express.json());

const Session = require("./data/models/Session");
const User = require("./data/models/User");
const Utterance = require("./data/models/Utterance");
const Report = require("./data/models/Report");
//creates routes for models and creates ways to store data types while posting/getting from database

/************\
* API ROUTES *
\************/
// Insert a Session
//creates session with two users, which it sends to database
apiRouter.post("/sessions/:user1_id/:user2_id", async (req, res) => {
    const user1Id = req.params.user1_id;
    const user2Id = req.params.user2_id;

    const session = new Session({
        user1_id: user1Id,
        user2_id: user2Id
    });

    const user1 = new User({
        user_id: user1Id,
        lines_of_code: 0,
        num_role_changes: 0,
        expression_scores: [0],
        num_interruptions: 0 ,
        num_utterances: 0   
    });

    const user2 = new User({
        user_id: user2Id,
        lines_of_code: 0,
        num_role_changes: 0,
        expression_scores: [0],
        num_interruptions: 0,
        num_utterances: 0    
    });

    try {
        // Check if a session already exists with these users
        const sessionUserOne = await Session.findOne({ $or: [{ user1_id: user1Id }, { user2_id: user1Id }] });
        const sessionUserTwo = await Session.findOne({ $or: [{ user1_id: user2Id }, { user2_id: user2Id }] });

        if (sessionUserOne || sessionUserTwo) {
            return res.status(409).send("Session already exists with these users");
        } else {
            await session.save();
            await user1.save();
            await user2.save();
            return res.send(session);
        }
    } catch (err) {
        return res.status(500).send("Failed to insert Session");
    }
});

// Insert a new utterance
//
apiRouter.post("/utterances", async (req, res) => {
    const utterance = new Utterance({
        user_id: req.body.user_id,
        start_time: req.body.start_time,  
        end_time: req.body.end_time,
        transcript: req.body.transcript  
    });
    try {
        const sessionUser = await Session.findOne({ $or: [{ user1_id: req.body.user_id }, { user2_id: req.body.user_id }] });
        if (!sessionUser) {
            return res.status(409).send("A session does not exist with these users");
        }
        const user = await User.findOne({ user_id: req.body.user_id });
        //update user's utterance count
        const utteranceUpdate = user.num_utterances + 1;
        await User.updateOne(
            { user_id: req.body.user_id },
            { num_utterances: utteranceUpdate });

            
        await utterance.save();
        return res.send(utterance);

    } catch(err) {
        res.status(500).send("Failed to insert Utterance" + err);
    }  
});

// Insert a report
apiRouter.post("/reports", async (req, res) => {
    const report = new Report({
        user_id: req.body.user_id,
        primary_communication: req.body.primary_communication,
        leadership_style: req.body.leadership_style,
        communication_style: req.body.communication_style,
        self_efficacy_level: req.body.self_efficacy_level  
    });
    try {
        const sessionUser = await Session.findOne({ $or: [{ user1_id: req.body.user_id }, { user2_id: req.body.user_id }] });

        if (!sessionUser) {
            return res.status(409).send("A session does not exist with these users");
        }

        await report.save();
        return res.send(report);
    } catch(err) {
        return res.status(500).send("Failed to insert Report");
    }  
});


// Retrive a user 
apiRouter.get("/users/:user_id", async (req, res) => {
    const userId = req.params.user_id;
    try {
        const user = await User.findOne({user_id: userId });

        if(!user) {
            return res.status(409).send(`${userId} does not exist`);
        }

        return res.send(user);
    } catch(err) {
        return res.status(500).send(`An error has occured retrieving ${userId}'s partner` + err);
    }
});

//Retrieve a user's report
apiRouter.get("/reports/:user_id", async (req, res) => {
    const userId = req.params.user_id;
    try {
        const report = await Report.findOne({user_id: userId }).sort({_id: -1});

        if(!report) {
            return res.status(409).send(`A report for ${userId} does not exist`);
        }

        return res.send(report);
    } catch(err) {
        return res.status(500).send("Failed to retrieve Report");
    }
});

//Delete all utterances
//This is used at the end of a session to clean up the collection
apiRouter.delete("/utterances", async (req, res) => {
    try {
        await Utterance.deleteMany({});
        return res.send("Successfully deleted all utterances");
    } catch(err) {
        return res.status(500).send("Failed to delete utterances");
    }
});

//Adds an expression score to the array of scores a user has
//This is updated every 5 minutes
apiRouter.put("/users/:user_id/expressionScore/:new_score", async (req, res) => {
    const userId = req.params.user_id;
    const newScore = req.params.new_score;
    try {
        const user = await User.findOne({user_id: userId});
        
        if(!user) {
            return res.status(409).send(`${userId} does not exist`);
        }

        await User.updateOne(
            { user_id: userId },
            { $push: { expression_scores: newScore } });
        return res.send(`Successfully updated ${userId}'s expression score`);
    } catch(err) {
       return res.status(500).send(`Failed to update ${userId}'s expression score`);
    }
});

//Calculates the number of times a user has interrupted their partner
apiRouter.get('/utterances/interruptions/:user_id/:partner_id', async (req, res) => {
    const userId = req.params.user_id;
    const partnerId = req.params.partner_id;
    try {
        const sessionUser1 = await Session.findOne({ $or: [{ user1_id: req.params.user_id }, { user2_id: req.params.user_id }] });
        const sessionUser2 = await Session.findOne({ $or: [{ user1_id: req.params.partner_id }, { user2_id: req.params.partner_id }] });
        const parnterUtterances = await Utterance.find({user_id: partnerId });

        if (!sessionUser1 || !sessionUser2) {
            return res.status(409).send("A session does not exist with these users");
        }

        var interruptionCount = 0;

        for(const utterance of parnterUtterances) {
            const start = utterance.start_time;
            const end = utterance.end_time;

            const interruptions = await Utterance.find({user_id: userId, start_time: {$gt : start, $lte: end}});

            if(interruptions) {
                interruptionCount += interruptions.length;
            }
        }        
        return res.send(`${interruptionCount}`);
        
    } catch(err) {
        return res.status(500).send(`Failed to retrieve interruptions for ${userId}`);
    }
});

// Inserts lines of code to a user
apiRouter.put('/users/:user_id/linesOfCode/:line_count', async (req, res) => {
    const userId = req.params.user_id;
    const lineCount = req.params.line_count;
    try {
        const user = await User.findOne({user_id: userId});
        
        if(!user) {
            return res.status(409).send(`${userId} does not exist`);
        }

        await User.updateOne(
            { user_id: userId },
            { lines_of_code: lineCount  });
        return res.send(`Successfully updated ${userId}'s lines of code`);
    } catch(err) {
       return res.status(500).send(`Failed to update ${userId}'s lines of code`);
    }
});


module.exports = apiRouter;