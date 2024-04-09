require('dotenv').config();
var config = {
  development: {
    app : {
      port: 51603
    },
    mongodb: {
      url: "root:root@localhost:27017/admin",
      name: "k1"
    },
    kafka:{
      host:"localhost",
      port:"9092"
    },
    cds :{
      repo : "http://localhost:51524"
    },
    keycloak: {
      server: process.env.DEV_KEYCLOAK_SERVER,
      password: process.env.DEV_KEYCLOAK_PWD
    }
    
  },
  production: {
    app : {
      port: process.env.DEV_PORT
    },
  mongodb: {
      url: process.env.DEV_MONGO_USERNAME + ":" + process.env.DEV_MONGO_PASSWORD + "@" +
        process.env.DEV_MONGO_HOST + ":" + process.env.DEV_MONGO_PORT,
      name: process.env.DEV_MONGO_NAME
  },
  kafka:{
      host: process.env.DEV_KAFKA_URL,
      port: process.env.DEV_KAFKA_PORT
  },
  cds :{
    repo : process.env.DEV_CDS_URL
  },
  keycloak: {
    server: process.env.DEV_KEYCLOAK_SERVER,
    password: process.env.DEV_KEYCLOAK_PWD
  }
  },
   colo: {
    app : {
      port: process.env.COLO_PORT
    },
  mongodb: {
      url: process.env.COLO_MONGO_USERNAME + ":" + process.env.COLO_MONGO_PASSWORD + "@" +
        process.env.COLO_MONGO_HOST + ":" + process.env.COLO_MONGO_PORT,
      name: process.env.COLO_MONGO_NAME
  },
  kafka:{
      host: process.env.COLO_KAFKA_URL,
      port: process.env.COLO_KAFKA_PORT
  },
  cds :{
    repo : process.env.COLO_CDS_URL
  },
  keycloak: {
    server: process.env.COLO_KEYCLOAK_SERVER,
    password: process.env.COLO_KEYCLOAK_PWD
  }
  },
  uat: {
    app : {
      port: process.env.COLO_PORT
    },
  mongodb: {
      url: process.env.UAT_MONGO_USERNAME + ":" + process.env.UAT_MONGO_PASSWORD + "@" +
        process.env.UAT_MONGO_HOST + ":" + process.env.UAT_MONGO_PORT,
      name: process.env.UAT_MONGO_NAME
  },
  kafka:{
      host: process.env.UAT_KAFKA_URL,
      port: process.env.UAT_KAFKA_PORT
  },
  cds :{
    repo : process.env.UAT_CDS_URL
  },
  keycloak: {
    server: process.env.UAT_KEYCLOAK_SERVER,
    password: process.env.UAT_KEYCLOAK_PWD
  }
  },
};

module.exports =config;