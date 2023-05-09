const env='stag'

const mongoConfig = {
    db: "users",
    collection: "captainSubServiceOnboarding",
    useMongoURL: true,
    mongoURL: process.env.MONGO_URL
};

if (env=='prod'){
    mongoConfig.mongoURL+=`&directConnection=true` // directConn
}


const kafkaConfig = {
    kafkaHost: 'kafka-staging-v2-1.db.backend.staging.internal:9092,kafka-staging-v2-2.db.backend.staging.internal:9092,kafka-staging-v2-3.db.backend.staging.internal:9092',
    clientId: "assureBackFilling",  
};

const queryConfig = {
    start: "642726a80000000000000000",
    end: "642c6ca70000000000000000",
    limit: 100,
    query: { "paymentInfo.joiningFee.transactionProgress.status": "completed" }
};

const others = {
    KAFKA_TOPIC_RIDER_SUB_SERVICE_ONBOARDING: "domain.entities.rider_sub_service_onboarding"
}

module.exports = { mongoConfig, kafkaConfig, queryConfig, others };