const { MongoClient } = require('mongodb');

const checkNodeEnv = require("./configService");

var config = checkNodeEnv();

const {
    mongodb: { url, name },
} = config;

console.log("Connected to DB ::" + url);


async function fetchNotifications(client, processEvent) {
    var query = {}
}

async function fetchToDoList(client, processEvent) {
    console.log("Notifications Fetched");

    var query = {
        $or: [
            {
                $and: [{
                    $or: [{ "userTasks.potentialUsers": [] },
                    { "userTasks.potentialGroups": [] },
                    { "userTasks.adminUsers": [] },
                    { "userTasks.adminGroups": [] }]
                },

                { "userTasks.state": "Ready" }
                ]
            },
            {
                $and: [{ "userTasks.excludedUsers": { $not: { $eq: "moaaz" } } },
                {
                    $or: [{ "userTasks.potentialUsers": "moaaz" },
                    { "userTasks.potentialGroups": "moaaz" },
                    { "userTasks.adminUsers": "moaaz" },
                    { "userTasks.adminGroups": "moaaz" }]
                },

                { "userTasks.state": "Ready" }
                ]
            }

        ]
    };

    var filter = { "userTasks.processInstanceId": 1, "userTasks.processId": 1, "userTasks.id": 1, "userTasks.referenceName": 1, "userTasks.taskName": 1 };

    const result = await client.db(name).collection("processes").find(query, filter).toArray();

    //console.log(result);

    for (let index in result) {
        console.log("Result Found");
        //console.log(result[index]);
    }


}

registerEvent = async function (event) {

    const client = new MongoClient("mongodb://" + url);

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        await fetchToDoList(client, "");
        console.log("register event called");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

};

registerEvent();
