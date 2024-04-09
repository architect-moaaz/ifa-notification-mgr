const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const axios = require('axios');
const { getUserDataForEmail, getPlaceholderMappings } = require('../../db/db');
const checkNodeEnv = require("../../configService");
var config = checkNodeEnv();

const {
  keycloak: { server, password},
  cds: { repo }
} = config;

const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    secure: false,
    port: 587,
    auth: {
        user: "info@tentoro.ai",
        pass: "Cuw86990"
    },
    tls: {
        ciphers:'SSLv3'
    }
});

const sendMail = async function(emailData) {

  //Accepting templatename, else choosing standard template
  console.log("Template Name : " + emailData.templateName);
  const templateName = emailData.templateName ? emailData.templateName : 'default';
  var filePath;
  var replacements = {
 
};
  const templateContent = await getTemplateFile(templateName + ".html");

	console.log("template content" + templateContent);
  if(templateContent != null) {
  
    if(emailData.model) {
        let _tempReplace = {};
        //Looping to read multiple data models
        for(let i of emailData.model) {
          _tempReplace[Object.keys(i)[0]] = JSON.parse(Object.keys(i).map(key => i[key]));
        }
        replacements = await getModelMappings(emailData, _tempReplace);
        //replacements = _tempReplace;
    }
  } else {
    filePath = path.join(__dirname, `../../templates/emails/default.html`);
  }
  replacements["processId"]=emailData.processId; 
  const source = filePath != null ? fs.readFileSync(filePath, 'utf-8').toString() : templateContent;
  const template = handlebars.compile(source);
  console.log("Replacement files:: " + JSON.stringify(replacements));
  const htmlToSend = template(replacements);

  //Getting user data
  const getInitiatedBy = emailData.toAddress.indexOf('initiator');
  const getLastHuman = emailData.toAddress.indexOf('lasthuman');
  //const userData = await getUserDataForEmail('753e4833-94c1-42d9-a543-9cd19989fffc');
  const userData = await getUserDataForEmail(emailData.processId);
  var toAddressess = emailData.toAddress;

  if(getInitiatedBy > -1 && userData){
    //Mail will be sent to initiator, picking up his email id
    toAddressess.splice(getInitiatedBy, 1);
    await getUserDetails(userData.initiatedBy)
      .then(userDetails => {
        toAddressess.push(userDetails.email);
      })
      .catch(error => console.error('Error getting user details:', error));
  }

  if(getLastHuman > -1 && userData) {
    //Mail will be sent to executor of last human task, picking up his email id
    toAddressess.splice(getLastHuman, 1);
    await getUserDetails(userData.lastHumanTask.actualOwner, emailData.workspace)
      .then(userDetails => {
        toAddressess.push(userDetails.email);
      })
      .catch(error => console.error('Error getting last user details:', error));
  }

  //Filtering emails based on regex for format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const filteredToAddress = toAddressess.filter(str => emailRegex.test(str));
  const filteredCcAddresss = emailData.ccAddress ? emailData.ccAddress.filter(str => emailRegex.test(str)) : [];
  const filteredBccAddresss = emailData.bccAddress ? emailData.bccAddress.filter(str => emailRegex.test(str)) : [];

  console.log("To Address ::" + filteredToAddress);
  const info = transporter.sendMail({
    from: 'info@tentoro.ai',
    to: filteredToAddress,
    cc: filteredCcAddresss,
    bcc: filteredBccAddresss,
    subject: emailData.subject ? emailData.subject : " ",
    text: "Sample",
    html: htmlToSend,
    headers: { 'x-myheader': 'test header' }
  }, function(error, info){
    if (error) {
      console.log("Error:::" + error);
      return 0;
    } else {
      console.log('Email sent: ' + info.response);
      return 1;
    }
  });

}

async function getUserDetails(username, workspace) {
  const realmName = workspace == 'demo' ? 'master' : workspace;
  const baseUrl = 'https://' + server + '/admin/realms';
  const tokenEndpoint = `${baseUrl}/${realmName}/protocol/openid-connect/token`;
  const userDetailsEndpoint = `${baseUrl}/${realmName}/users?username=${username}&exact-true`;

  try {
    // Get a bearer token
    const params = new URLSearchParams({

      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: password
  
  });
    const response = await axios.post(`https://${server}/realms/${realmName}/protocol/openid-connect/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
         }   
        });
    const accessToken = response.data.access_token;

    // Make a request to get user details
    const headers = { Authorization: `Bearer ${accessToken}` };
    const userDetailsResponse = await axios.get(userDetailsEndpoint, { headers });

    return userDetailsResponse.data[0]; // Return the first user found
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
}

async function getModelMappings(emailData, tempReplacements) {

  var replacements = {};

  for(let model in tempReplacements) {
    const params = {
      workspace : emailData.workspace,
      app: emailData.app,
      templateName: emailData.templateName + ".html",
      model: model
    };
    const placeholderMapping = await getPlaceholderMappings(params);
    if(placeholderMapping != null) {
      for(let i in placeholderMapping) {
        const value = tempReplacements[model][placeholderMapping[i]];
        if(value != null) {
          replacements[i] = value;
        }
      }
    }
  }
  return replacements;
  
}

async function getTemplateFile(filename) {

  var filePath = path.join(__dirname, `../../templates/emails/${filename}`);

   var content =     fs.readFileSync(filePath, 'utf-8').toString()
  return content;

  /* Below code is to fetch the templates from cds */
 /*try {
  const response = await axios.get(`${repo}/template`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'filename': filename
       }  
  });

	
  return response.data;
 } catch(error) {
  console.log("Error Occured connecting to CDS \n ", error);

 var filePath = path.join(__dirname, `../../templates/emails/${filename}`);

   var content =     fs.readFileSync(filePath, 'utf-8').toString()
  return content;
 }*/
}


module.exports = sendMail;
