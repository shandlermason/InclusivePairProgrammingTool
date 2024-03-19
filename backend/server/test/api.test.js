process.env.NODE_ENV = 'test';
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../server");
const { MongoMemoryServer } = require('mongodb-memory-server');
require("dotenv").config();
//sample test database, test using jest

//_________HOW TO TEST_________
//test compand -> \backend\server> npm test

let mongoServer;
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});
  
afterEach(async () => {
    await mongoose.connection.dropDatabase();

});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("session", () => {
    describe("creating a session", () => {
        describe("given 2 users who haven't been registered", () => {
            it("should return the session payload", async () => {

                const res = await supertest(app).post('/api/sessions/User1/User2');
                expect(res.statusCode).toBe(200);
                expect(res.body.user1_id).toEqual("User1");
                expect(res.body.user2_id).toEqual("User2");
            });

            it("should create 2 users in the db", async () => {
                await supertest(app).post('/api/sessions/User1/User2');

                const user1 = await supertest(app).get('/api/users/User1');
                expect(user1.statusCode).toBe(200);
                expect(user1.body.user_id).toEqual("User1");

                const user2 = await supertest(app).get('/api/users/User2');
                expect(user2.statusCode).toBe(200);
                expect(user2.body.user_id).toEqual("User2");
                expect(user2.body.num_utterances).toEqual(0);

            });
        });

        describe("given a User 1 has already been reigstered", () => {
            it("should return a 409 error", async () => {
                //Post User 1 to db
                await supertest(app).post('/api/sessions/User1/User2');
                //Post User 1 again to db
                const res = await supertest(app).post('/api/sessions/User1/User3');
                expect(res.statusCode).toBe(409);
                expect(res.text).toEqual("Session already exists with these users");
            })
        });

        describe("given a User 2 has already been reigstered", () => {
            it("should return a 409 error", async () => {
                //Post User 1 to db
                await supertest(app).post('/api/sessions/User1/User2');
                //Post User 1 again to db
                const res = await supertest(app).post('/api/sessions/User2/User3');
                expect(res.statusCode).toBe(409);
                expect(res.text).toEqual("Session already exists with these users");
            });
        });
    });

    describe("Retrieving a user's partner id", () => {

    });
});

describe("utterance", () => {
    describe("inserting an utterance", () => {
        describe("given the user of the utterance exists in the db", () => {
            it("should return the utterance payload", async () => {
                //Post User 1 to db
                await supertest(app).post('/api/sessions/User1/User2');

                const res = await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User1",
                    start_time: 1000,
                    end_time: 1500,
                    transcript: "Hello World"
                });

                expect(res.statusCode).toBe(200);
                expect(res.body.user_id).toEqual("User1");
                expect(res.body.start_time).toEqual(1000);
                expect(res.body.end_time).toEqual(1500);
                expect(res.body.transcript).toEqual("Hello World");

                const user1 = await supertest(app).get('/api/users/User1');
                expect(user1.body.num_utterances).toEqual(1);


            });
        });

        describe("given the user of the utterance doesn't exist in the db", () => {
            it("should return a 409 error", async () => {
                const res = await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User1",
                    start_time: 1000,
                    end_time: 1500,
                    transcript: "Hello World"
                });

                expect(res.statusCode).toBe(409);
                expect(res.text).toEqual("A session does not exist with these users");
            })
        });
    });

    describe("calculating an interruption", () => {
        describe("given each of the user's exist", () => {
            it("should calculate the number of interruptions", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User1",
                    start_time: 1000,
                    end_time: 1500,
                    transcript: "Hello World"
                });

                await supertest(app).post('/api/utterances').send(
                {
                        user_id: "User1",
                        start_time: 3000,
                        end_time: 3500,
                        transcript: "Let's get started!"
                });
                
                //Add utterances user 2
                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User2",
                    start_time: 1200,
                    end_time: 1250,
                    transcript: "Hi!!"
                });

                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User2",
                    start_time: 1300,
                    end_time: 1400,
                    transcript: "Hello??"
                });

                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User2",
                    start_time: 3001,
                    end_time: 3100,
                    transcript: "Um"
                });

                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User2",
                    start_time: 3500,
                    end_time: 3600,
                    transcript: "Wait"
                });

                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User2",
                    start_time: 4000,
                    end_time: 4200,
                    transcript: "Yes let's start"
                });

                //Get interruptions
                const res1 = await supertest(app).get('/api/utterances/interruptions/User2/User1');
                expect(res1.statusCode).toBe(200);
                expect(res1.text).toEqual("4");

                const res2 = await supertest(app).get('/api/utterances/interruptions/User1/User2');
                expect(res2.statusCode).toBe(200);
                expect(res2.text).toEqual("0");
                
            });
        });

        describe("given user 1 doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User1",
                    start_time: 1000,
                    end_time: 1500,
                    transcript: "Hello World"
                });

                const res1 = await supertest(app).get('/api/utterances/interruptions/User3/User2');
                expect(res1.statusCode).toBe(409);
            });
        });

        describe("given user 2 doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                await supertest(app).post('/api/utterances').send(
                {
                    user_id: "User1",
                    start_time: 1000,
                    end_time: 1500,
                    transcript: "Hello World"
                });

                const res1 = await supertest(app).get('/api/utterances/interruptions/User1/User3');
                expect(res1.statusCode).toBe(409);
            });
        });
    });
});

describe("report", () => {
    describe("inserting a report", () => {
        describe("given the user exists", () => {
            it("should return the report payload", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                const res = await supertest(app).post('/api/reports').send(
                {
                    user_id: "User1",
                    primary_communication: "Driver",
                    leadership_style: "Authoritative",
                    communication_style: "Verbal",
                    self_efficacy_level: "Low"
                });
                expect(res.statusCode).toBe(200);
                expect(res.body.user_id).toEqual("User1");
                expect(res.body.primary_communication).toEqual("Driver");
                expect(res.body.leadership_style).toEqual("Authoritative");
                expect(res.body.communication_style).toEqual("Verbal");
                expect(res.body.self_efficacy_level).toEqual("Low");

            });
        });

        describe("given the user doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                const res = await supertest(app).post('/api/reports').send(
                {
                    user_id: "User3",
                    primary_communication: "Driver",
                    leadership_style: "Authoritative",
                    communication_style: "Verbal",
                    self_efficacy_level: "Low"
                });
                expect(res.statusCode).toBe(409);
            });
        });
    });

    describe("retrieving a report", () => {
        describe("given a report for the user exists", () => {
            it("should return the report", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                await supertest(app).post('/api/reports').send(
                {
                    user_id: "User1",
                    primary_communication: "Driver",
                    leadership_style: "Authoritative",
                    communication_style: "Verbal",
                    self_efficacy_level: "Low"
                });

                const res = await supertest(app).get('/api/reports/User1');
                expect(res.statusCode).toBe(200);
                expect(res.body.user_id).toEqual("User1");
                expect(res.body.primary_communication).toEqual("Driver");
                expect(res.body.leadership_style).toEqual("Authoritative");
                expect(res.body.communication_style).toEqual("Verbal");
                expect(res.body.self_efficacy_level).toEqual("Low");

            });
        });

        describe("given a report for the user doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //Add utterances user 1
                await supertest(app).post('/api/reports').send(
                {
                    user_id: "User1",
                    primary_communication: "Driver",
                    leadership_style: "Authoritative",
                    communication_style: "Verbal",
                    self_efficacy_level: "Low"
                });
                
                const res = await supertest(app).get('/api/reports/User3');
                expect(res.statusCode).toBe(409);
            });
        });
    });
});

describe("user", () => {
    describe("update expression score", () => {
        describe("given the user exists", () => {
            it("should return a 200 success message", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //update score
                const res = await supertest(app).put('/api/users/User1/expressionScore/0.1');
                expect(res.statusCode).toBe(200);
                expect(res.text).toEqual("Successfully updated User1's expression score");

                //see if score is updated
                let user1 = await supertest(app).get('/api/users/User1');
                expect(user1.statusCode).toBe(200);
                expect(user1.body.expression_scores).toHaveLength(2);
                expect(user1.body.expression_scores[1]).toEqual(0.1);

                //update the score a second time
                const res2 = await supertest(app).put('/api/users/User1/expressionScore/-0.1');
                expect(res2.statusCode).toBe(200);

                //see if score is updated
                user1 = await supertest(app).get('/api/users/User1');
                expect(user1.statusCode).toBe(200);
                expect(user1.body.expression_scores).toHaveLength(3);
                expect(user1.body.expression_scores[2]).toEqual(-0.1);

            });
        });

        describe("given the user doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //update score
                const res = await supertest(app).put('/api/users/User3/expressionScore/0.1');
                expect(res.statusCode).toBe(409);
                expect(res.text).toEqual("User3 does not exist");

            })
        });
    });

    describe("update lines of code", () => {
        describe("given the user exists", () => {
            it("should return a 200 success message", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //update score
                const res = await supertest(app).put('/api/users/User1/linesOfCode/13');
                expect(res.statusCode).toBe(200);
                expect(res.text).toEqual("Successfully updated User1's lines of code");

                //see if score is updated
                let user1 = await supertest(app).get('/api/users/User1');
                expect(user1.statusCode).toBe(200);
                expect(user1.body.lines_of_code).toEqual(13);
            });
        });

        describe("given the user doesn't exist", () => {
            it("should return a 409 error", async () => {
                //Create session
                await supertest(app).post('/api/sessions/User1/User2');

                //update score
                const res = await supertest(app).put('/api/users/User3/linesOfCode/13');
                expect(res.statusCode).toBe(409);
                expect(res.text).toEqual("User3 does not exist");

            })
        });
    });


    
});