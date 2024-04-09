// import the `Kafka` instance from the kafkajs library
const { Kafka } = require("kafkajs");

const checkNodeEnv = require("../../configService");

var config = checkNodeEnv();

const {
  kafka: { host, port },
} = config;

// the client ID lets kafka know who's producing the messages
const clientId = "notify-mgr";
// we can define the list of brokers in the cluster
const brokers = [host + ":" + port];
// this is the topic to which we want to write messages
const topic = "email";

// initialize a new kafka client and initialize a producer from it
const kafka = new Kafka({ clientId, brokers });

const consumer = kafka.consumer({ groupId: clientId});

const consume = async(callback) => {
    await consumer.connect();
    //Consumes the latest offset
    await consumer.subscribe({ topic });
    await consumer.run({
        // this function is called every time the consumer gets a new message
        eachMessage: async ({ message }) => {
          const jsonString = message.value.toString("utf-8");
          const emailData = JSON.parse(jsonString);
            callback(emailData);
            console.log(`received message: ${message.value}`);
      },
    });
}

module.exports = consume;