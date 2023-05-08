const { Kafka } = require("kafkajs");
const { kafkaConfig, others } = require("./config");

let producer = null;

const pushToKafka = async (topic, message, key) => {
  const logInfo = {
    id : message.id
  }
  try {
    const kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.kafkaHost.split(','),
      // brokers: [`kafka-staging-v2-1.db.backend.staging.internal:9092`]
    });
    producer = kafka.producer();
    await producer.connect();

    await producer.send({
      topic: topic,
      messages: [{ key: key, value: JSON.stringify(message) }],
    });
    await producer.disconnect()
    console.log("Message pushed to Kafka",logInfo);
  } catch (error) {
    console.error("Error pushing message to Kafka:", error, logInfo);
    throw error;
  }
};

async function getProducer() {
  const kafka = new Kafka({
    clientId: kafkaConfig.clientId,
    brokers: kafkaConfig.kafkaHost.split(','),
    // brokers: [`kafka-staging-v2-1.db.backend.staging.internal:9092`]
  });
  producer = kafka.producer();
  await producer.connect();
  return producer
}

(async()=>{
  producer = await getProducer()
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log("------------Done")
})()


module.exports = { producer };