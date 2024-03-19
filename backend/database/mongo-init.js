db.createUser(
    {
        user: process.env.MONGO_USER,
        pwd: process.env.MONGO_PASSWORD,
        roles: [
            {
                role: "dbOwner",
                db: "pairProgrammingTool"
            }
        ]
    }
);

//creates user using parameters specified in .env, starting database and establishing user