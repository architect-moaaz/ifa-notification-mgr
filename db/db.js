const { MongoClient } = require("mongodb");

const checkNodeEnv = require("../configService");

var config = checkNodeEnv();

const {
  mongodb: { url, name },
} = config;

async function fetchStages(client, processId, workspace) {
  var query = { id: processId, workspace: workspace };
  var filter = { stages: 1, appDisplayName: 1 };

  console.log("Process ID : " + processId);
  const result = await client
    .db(name)
    .collection("processes")
    .find(query)
    .project(filter)
    .toArray();

  return result;
}

async function fetchNotifications(client, params) {
  var query = { initiatedBy: params.user, workspace: params.workspace };
  var filter = {
    app: 1,
    processId: 1,
    workspace: 1,
    notifications: 1,
    appDisplayName: 1,
  };

  const result = await client
    .db("k1")
    .collection("processes")
    .find(query)
    .project(filter)
    .toArray();

  return result;
}

async function fetchActivities(client, params) {
  var query = {
    initiatedBy: params.user,
    app: params.app,
    workspace: params.workspace,
    "information.endDate": null,
  };
  if (params.app) {
    query = {
      initiatedBy: params.user,
      app: params.app,
      workspace: params.workspace,
    };
  } else {
    query = { initiatedBy: params.user, workspace: params.workspace };
  }
  // var query = { initiatedBy: params.user, app: params.app };
  var filter = {
    id: 1,
    app: 1,
    workspace: 1,
    appDisplayName: 1,
    "information.processName": 1,
    "information.processId": 1,
    "information.startDate": 1,
    "information.endDate": 1,
    first: { $arrayElemAt: ["$stages", 0] },
    status: {
      $cond: [
        { $eq: [{ $ifNull: ["$information.endDate", null] }, null] },
        "INPROGRESS",
        "COMPLETED", // commented this out as only INPROGRESS is requried
      ],
    },
  };
  const result = await client
    .db(name)
    .collection("processes")
    .aggregate()
    .match(query)
    .project(filter)
    .sort({ _id: -1 })
    .limit(100)
    .toArray();

  return result;
}

async function fetchToDoList(client, params) {
  console.log("Notifications Fetched");
  if (params) {
    var groups = params.group ? params.group.split(",") : [];
    var user = params.user ? params.user : "";
    var workspace = params.workspace ? params.workspace : "";
    var appname = params.appname ? params.appname : "";
  }

  var _search_query = {
    state: "Ready",
  };

  if (user) {
    _search_query["potentialUsers"] = {$in :[user] };
  }

  if (groups.length > 0) {
    _search_query["potentialGroups"] = groups;
  }

  var query = {
    $and: [
      { workspace: workspace },

      {
        $or: [
          {
            userTasks: {
              $elemMatch: _search_query,
            },
          },

          {
            userTasks: {
              $elemMatch: {
                state: "Ready",
                potentialUsers: { $size: 0 },
                potentialGroups: { $size: 0 },
              },
            },
            initiatedBy: user
          },
        ],
      },
    ],
  };
  //console.log("query formed : " + JSON.stringify(query));
  if (appname) {
    query.$and.push({ app: appname });
  }
  console.log("To Do List Query: " + JSON.stringify(query));
  var filter = {
    app: 1,
    processId: 1,
    workspace: 1,
    initiatedBy: 1,
    "userTasks.processInstanceId": 1,
    "userTasks.processId": 1,
    "userTasks.id": 1,
    "userTasks.referenceName": 1,
    "userTasks.taskName": 1,
    "userTasks.startDate": 1,
    appDisplayName: 1,
  };
  const result = await client
    .db(name)
    .collection("processes")
    .find(query)
    .project(filter)
    .toArray();
  //console.log(result);
  return result;
}

module.exports.getToDoList = async function (params) {
  const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");
  console.log("Connected to DB:" + url);

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    return await fetchToDoList(client, params);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

module.exports.getProcessStage = async function (params) {
  const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    return await fetchStages(client, params.processId, params.workspace);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

module.exports.getNotifications = async function (params) {
 // const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");

const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");
console.log("Connected to DB:" + url);
  try {
    // Connect to the MongoDB cluster
    await client.connect();

    return await fetchNotifications(client, params);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

module.exports.getRecentAcitivites = async function (params) {
  const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    return await fetchActivities(client, params);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

module.exports.getUserDataForEmail = async function (params) {
  const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");
  try {
    await client.connect();
    const collection = client.db(name).collection("processes");
    var cusrsor = collection.aggregate([
      {
        $match: {
          id: params,
        },
      },
      {
        $project: {
          initiatedBy: 1,
          lastHumanTask: { $arrayElemAt: ["$userTasks", 0] },
        },
      },
    ]);
    const response = await cusrsor.toArray();
    return response[0];
  } catch (err) {
    console.log("Error");
  }
};

module.exports.getPlaceholderMappings = async function (params) {
  const client = new MongoClient("mongodb://devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030");
  try {
    await client.connect();
    const collection = client.db("notification").collection("dm-placeholder-map");
    console.log("Query params:: " +  JSON.stringify(params));
    var cusrsor = collection.aggregate([
      {
        $match: {
          workspaceName: params.workspace,
          miniapp: params.app,
          fileName: params.templateName,
          modelName: params.model
        },
      },
      {
        $project: {
          dmMapping: 1
        },
      },
    ]);
    const response = await cusrsor.toArray();
    console.log("Response from DB ::" + JSON.stringify(response));
    return response[0] ? response[0].dmMapping : null;
  } catch (err) {
    console.log("Error");
  }
};

