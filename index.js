const express = require('express')
const axios = require('axios')
const { Readable } = require('stream');
const FormData = require('form-data');
const MongoClient = require('mongodb').MongoClient;
const configuration = require('./config');
const app = express()

const cors = require('cors');

var db = require("./db/db.js");

const checkNodeEnv = require("./configService");
const consume = require('./service/kafka/kafkaConsumer.js');
const mailTransponder = require("./service/email/sendEmail");
const sendMail = require('./service/email/sendEmail');
const bodyParser = require('body-parser');
const validator = require('html-validator');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));
const multer = require('multer');
const cheerio = require('cheerio');
const upload = multer();
var config = checkNodeEnv();

const {
  app: { port },
  cds: {repo},
  mongodb: { url }
} = config;

app.use(cors());
app.use(express.json())


app.get("/app/user/notifications/", (req, res) => {

  let _user = req.query.user;
  let _group = req.query.group;
  let _workspace = req.headers.workspace;

    db.getNotifications({ user: _user,workspace:_workspace }).then((result) => {
	console.log("***********Result**************");
	console.log(result);

    if (result.length == 0) {
      res.status(204).send({ message: "No Notications Found", data: { count: 0 } });
    } else {

      res.send({ "message": `Notifcations found for ${_user}`, data: { count: result.length, notifications: result } });
    }

  }).catch((err) => {
    res.status(500).send({ message: "Something went wrong. Contact IF Administrtion" });
    console.log(err);
  });
});

app.get("/app/user/worklist/", (req, res) => {

  let _assignedTo = req.query.user;
  let _group = req.query.group;
  let _workspace = req.headers.workspace;
  let _appname = req.headers.appname;

    db.getToDoList({ user: _assignedTo,workspace: _workspace, appname: _appname }).then((result) => {

    if (result.length == 0) {
      res.status(204).send({ message: "No Task List found", data: { count: 0 } });
    } else {

      res.send({ "message": `Task List found for ${_assignedTo}`, data: { count: result.length, tasks: result } });
    }
  }).catch((err) => {
    console.log(err);
    res.status(500).send({ message: "Something went wrong. Contact IF Administrtion" });
  });

});

app.get("/app/user/activities/", (req, res) => {

  let _assignedTo = req.query.user;
  let _app = req.params.appName;
  let _workspace = req.headers.workspace;

    db.getRecentAcitivites({ user: _assignedTo,workspace: _workspace }).then((result) => {
    //console.log(result);
    if (result.length == 0) {
      res.status(204).send({ message: "No Task List found", data: { count: 0 } });
    } else {

      res.send({ "message": `Recent activites found for ${_assignedTo}`, data: { count: result.length, tasks: result } });
    }
  }).catch((err) => {
    console.log(err);
    res.status(500).send({ message: "Something went wrong. Contact IF Administrtion" });
  });

});

app.get("/app/user/activities/:appName/", (req, res) => {

  let _assignedTo = req.query.user;
  let _app = req.params.appName;
  let _workspace = req.headers.workspace;

    db.getRecentAcitivites({ user: _assignedTo, app: _app,workspace: _workspace }).then((result) => {
    //console.log(result);
    if (result.length == 0) {
      res.status(204).send({ message: "No Task List found", data: { count: 0 } });
    } else {

      res.send({ "message": `Recent activites found for ${_assignedTo}`, data: { count: result.length, tasks: result } });
    }
  }).catch((err) => {
    console.log(err);
    res.status(500).send({ message: "Something went wrong. Contact IF Administrtion" });
  });

});

app.get("/app/process/stages/:processId", (req, res) => {

  let _processId = req.params.processId;
  let _group = req.query.group;
  let _workspace = req.headers.workspace;

    db.getProcessStage({ processId: _processId,workspace: _workspace }).then((result) => {
    //console.log("processes found : " + result);
    if (result) {
      res.send({ "message": `Stages found for ${_processId}`, data: { count: result.length, stages: result[0].stages } });
    } else {
      res.status(404).send({ message: "No Task List found", data: { count: 0 } });

    }
  }).catch((err) => {
    console.log(err);
    res.status(500).send({ message: "Something went wrong. Contact IF Administrtion" });
  });

});

app.post("/notify/userTask", (req, res) => {
    if(sendMail(req.body) != 1) {
    res.status(409).send({ message: "Email Sending Failed" });
  } else {
    res.status(201).send({ "message": "Mail sent" });
  }

});

// add template with placeholders extraction
app.post('/app/notificationtemplate/create', upload.single('htmlFileContent'), async (req, res) => {

  //const { workspaceName, fileName, fileName, collection } = req.query;
  const workspaceName = req.headers.workspace;
  const miniappName = req.headers.miniapp;
  const fileName = req.headers.filename;
  const collectionName = "template";

  // Read the contents of the uploaded file
  const htmlFileContent = req.file.buffer.toString('utf-8');

  const validationOptions = {
    format: 'json',
    data: htmlFileContent,
  };
  //  const validationResults = await validator({ data: htmlFileContent });
  const validationResults = await validator(validationOptions);
  /*if (validationResults.messages.length > 0) {
    // Return error response if HTML is invalid
    const errors = validationResults.messages.map((message) => message.message);
    res.status(400).send({ errors });
    return;
  }*/


  // Parse the HTML content using cheerio
  const $ = cheerio.load(htmlFileContent);
  const placeholderRegex = /\{\{(.+?)\}\}/g;

  // Find all text nodes that contain placeholders
  const textNodesWithPlaceholders = $('*:not(script):not(style)')
    .contents()
    .filter(function () {
      return this.nodeType === 3 && /\{\{(.+?)\}\}/.test(this.nodeValue);
    });

  // Extract the placeholders from the text nodes
  const placeholders = textNodesWithPlaceholders
    .map(function () {
      const text = this.nodeValue;
      const matches = text.match(placeholderRegex);
      if (matches) {
        return matches.map(match => match.slice(2, -2));
      }
      return null;
    })
    .get()
    .flat()
    .filter((value, index, self) => self.indexOf(value) === index);



  // Create a FormData object to send the HTML file content as a file in the request body
  const formData = new FormData();
  const buffer = Buffer.from(htmlFileContent, 'utf-8');
  const stream = Readable.from(buffer);
  console.log("filename = ", fileName);
  console.log("collection", collectionName);
  formData.append('file', stream, {
    filename: fileName || 'file.html',
    contentType: 'text/html',
    collection: collectionName
  });

  try {
    // Send a POST request to the /collection/upload API with the HTML file content
    const response = await axios.post(
      `${repo}/template/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    // save placeholders in the db
    const client = await MongoClient.connect("mongodb://" + url, { useNewUrlParser: true });
    const db = client.db('notification');
    const collection = db.collection('templateplaceholders');
    const fileName = response.data.file.filename;
    console.log("file = ", fileName);
    const result = await collection.insertOne({ workspaceName, miniappName, placeholders, fileName });
    await client.close();

    // Send the results back to the client
    res.status(200).send({ workspaceName, miniappName, placeholders, file: response.data.file });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal server error while saving file into cds' });
  }
});

// update template with placefolders update
app.put('/app/notificationtemplate/update', upload.single('htmlFileContent'), async (req, res) => {

  //const { workspaceName, miniappName, fileName, collection } = req.query;
  const workspaceName = req.headers.workspace;
  const miniappName = req.headers.miniapp;
  const fileName = req.headers.filename;
  const collectionName = "template";

  // Read the contents of the uploaded file
  const htmlFileContent = req.file.buffer.toString('utf-8');

  // validating the contnt of the html file
  const validationOptions = {
    format: 'json',
    data: htmlFileContent,
  };
  const validationResults = await validator(validationOptions);
  /*if (validationResults.messages.length > 0) {
    // Return error response if HTML is invalid
    const errors = validationResults.messages.map((message) => message.message);
    res.status(400).send({ errors });
    return;
  }*/


  // Parse the HTML content
  const $ = cheerio.load(htmlFileContent);
  const placeholderRegex = /\{\{(.+?)\}\}/g;

  // Find all text nodes that contain placeholders
  const textNodesWithPlaceholders = $('*:not(script):not(style)')
    .contents()
    .filter(function () {
      return this.nodeType === 3 && /\{\{(.+?)\}\}/.test(this.nodeValue);
    });

  // Extract the placeholders from the text nodes
  const placeholders = textNodesWithPlaceholders
    .map(function () {
      const text = this.nodeValue;
      const matches = text.match(placeholderRegex);
      if (matches) {
        return matches.map(match => match.slice(2, -2));
      }
      return null;
    })
    .get()
    .flat()
    .filter((value, index, self) => self.indexOf(value) === index);



  // Create a FormData object to send the HTML file content as a file in the request body
  const formData = new FormData();
  const buffer = Buffer.from(htmlFileContent, 'utf-8');
  const stream = Readable.from(buffer);
  formData.append('file', stream, {
    filename: fileName || 'file.html',
    contentType: 'text/html',
    collection: collectionName
  });

  try {
    // Send a POST request to the /template/upload API with the HTML file content
    const response = await axios.post(
      `${repo}/template/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    // save placeholders in the db
    const client = await MongoClient.connect("mongodb://" + url, { useNewUrlParser: true });
    const db = client.db('notification');
    const collection = db.collection('templateplaceholders');
    console.log("file = ", fileName);
    const filter = { fileName: fileName };
    const update = { $set: { workspaceName: workspaceName, miniappName: miniappName, placeholders: placeholders } };
    const result = await collection.updateOne(filter, update);
    console.log(`${result.matchedCount} document(s) matched the filter criteria.`);
    console.log(`${result.modifiedCount} document(s) was/were updated.`);
    await client.close();

    // Send the results back to the client
    // res.status(200).send({ workspaceName, miniappName, placeholders, file: response.data.file });
    res.status(200).send({ workspaceName, miniappName, placeholders });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal server error while saving file into cds' });
  }
});

// api to get placeholders based of workspacename or miniappname
app.get('/app/notificationtemplate/placeholders', async (req, res) => {

  const workspaceName = req.headers.workspace;
  const miniappName = req.headers.miniapp;

  try {
    const client = await MongoClient.connect("mongodb://" + url, { useNewUrlParser: true });
    const db = client.db('notification');
    const collection = db.collection('templateplaceholders');
    let transformedResponse = {};
    if (miniappName && miniappName.trim() !== '') {
      const cursor = collection.find({ workspaceName, miniappName });
      // Convert the cursor to an array of documents
      const documents = await cursor.toArray();

      // Transform the response for the filtered documents
      documents.forEach(doc => {
        const { fileName, placeholders } = doc;
        transformedResponse[fileName] = placeholders;
      });

      res.status(200).send(transformedResponse);

    } else {
      const cursor = collection.find({ workspaceName });
      // Convert the cursor to an array of documents
      const documents = await cursor.toArray();
      // Transform the response for the filtered documents
      documents.forEach(doc => {
        const { miniappName, fileName, placeholders } = doc;
        if (!transformedResponse.hasOwnProperty(miniappName)) {
          transformedResponse[miniappName] = {};
        }
        transformedResponse[miniappName][fileName] = placeholders;
      });

      res.status(200).send(transformedResponse);
    }
    // Close the database connection
    await client.close();
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal server error while retrieving workspace data' });
  }
});

app.post("/app/notificationtemplate/mapping/create", async(req, res) => {

  const workspace = req.headers.workspace;
  const miniapp = req.headers.miniapp;
  const fileName = req.headers.filename;
  const modelName = req.headers.modelname;

  const dmMapping = req.body;

  try {
    const client = await MongoClient.connect("mongodb://" + url, { useNewUrlParser: true });
    const db = client.db('notification');
    const collection = db.collection('dm-placeholder-map');
    const result = await collection.insertOne({ workspace, miniapp, fileName, modelName, dmMapping});
    await client.close();

    res.status(200).send({ workspace, miniapp, fileName, modelName, dmMapping });
  } catch(error) {
    console.log("Error Occurred \n ", error);
    res.status(500).send({ error: "Error Occurred, Please contact Server Support" });
  }

});

// api to get placeholders based of workspacename or miniappname
app.get('/app/notificationtemplate/mappings', async (req, res) => {

  const workspaceName = req.headers.workspace;
  const miniappName = req.headers.miniapp;
  const modelName = req.headers.modelname;

  try {
    const client = await MongoClient.connect("mongodb://" + url, { useNewUrlParser: true });
    const db = client.db('notification');
    const collection = db.collection('dm-placeholder-map');
    let transformedResponse = {};
    if (modelName && modelName.trim() !== '') {
      const cursor = collection.find({ workspace: workspaceName, miniapp: miniappName , modelName: modelName});
      const documents = await cursor.toArray();
      
      documents.forEach(doc => {
        const { fileName, dmMapping } = doc;
        transformedResponse[fileName] = dmMapping;
      });
      
      res.status(200).send(transformedResponse);

    } else {
      const cursor = collection.find({ workspace: workspaceName, miniapp: miniappName });
      const documents = await cursor.toArray();
      documents.forEach(doc => {
        const { miniapp, modelName, fileName, dmMapping } = doc;
        if (!transformedResponse.hasOwnProperty(miniapp)) {
          transformedResponse[miniapp] = {};
        }
        if (!transformedResponse[miniapp].hasOwnProperty(modelName)) {
          transformedResponse[miniapp][modelName] = {};
        }
        transformedResponse[miniapp][modelName][fileName] = dmMapping;
      });
      
      res.status(200).send(transformedResponse);
      
      
    }
    // Close the database connection
    await client.close();
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Internal server error while retrieving workspace data' });
  }
});

const DeviceEnum = Object.freeze({
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  DESKTOP: 'DESKTOP'
});

app.put('/device/update', async(req,res) =>{
  const workspace = req.headers.workspace;
  let device = req.headers.device;
  const user = req.headers.user;
  const token = req.body.token
  if(!device || !DeviceEnum[device.toUpperCase()]){
    return res.status(400).json({message: "The device value can be either ANDROID,IOS or DESKTOP."});
  }
  if(!token || token.length <= 0){
    return res.status(400).json({message: "The device token cannot be null or empty."});
  }
  device = device && DeviceEnum[device.toUpperCase()] ? device.toUpperCase() : DeviceEnum.ANDROID;
  const filter = {
    workspace: workspace,
    device: device,
    user: user
  }
  const data = {
    workspace: workspace,
    device: device,
    user: user,
    token: token
  }
  try {
    const client = new MongoClient("mongodb://" + url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const db = client.db("notification");
    const collection = db.collection("deviceInfo");
    const result = await collection.updateOne(filter, { $set: data }, { upsert: true });
    if (result.upsertedCount > 0) {
      res.status(201).json({ message: 'Data inserted successfully' });
    } else {
      res.status(200).json({ message: 'Data updated successfully' });
    }
    client.close();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});

// start the consumer, and log any errors
consume(mailTransponder).catch((err) => {
  console.error("error in consumer: ", err)
});
