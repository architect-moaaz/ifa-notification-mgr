const configData = require("./config");

function checkNodeEnv() {
  var env = process.env.NODE_ENV || "development";
  var config = null;
  if (env.trim() == "development") {
    console.log("Running Local Environment");
    config = configData.colo;
  } else if (env.trim() == "production") {
    console.log("Running Production/Dev Environment");
    config = configData.production;
  } else if (env.trim() == "colo") {
    console.log("Running Colo Environment");
    config = configData.colo;
  } else {
    console.log("Running UAT Environment");
    config = configData.uat;
  }
  return config;
}
module.exports = checkNodeEnv;
