const ObjectId = require('mongoose').Types.ObjectId;
const { producer } = require('./kafka');
const { queryConfig, mongoConfig, others, kafkaConfig } = require("./config");
// const {cssoModel} = require("./model");
// const {conn} = require("./mongo");
const mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;



let lastCursor;

function getCurrentTransactionProgressObj(cssoRecord) {
    if (!cssoRecord?.paymentInfo?.joiningFee?.transactionProgress) {
        throw new Error("Missing required field");
    }

    const transactionProgressArray = cssoRecord.paymentInfo.joiningFee.transactionProgress;
    if (transactionProgressArray.length === 0) {
        throw new Error("Transaction progress array is empty");
    }
    return transactionProgressArray[transactionProgressArray.length - 1];
}

function getActualAmount(joiningFee) {
    if (!joiningFee?.baseAmount || !joiningFee?.discountPercentage) {
        throw new Error("Missing required field");
    }
    return joiningFee.baseAmount * (1 - joiningFee.discountPercentage / 100);
}

function createRssoEvent(cssoRecord) {
    const transactionProgressObj = getCurrentTransactionProgressObj(cssoRecord);
    let rssoEvent = {
        eventType: "joiningFee",
        joiningFee: {
            payment: {
                correlationId: transactionProgressObj?.correlationId,
                paymentId: transactionProgressObj?.paymentId,
                failureReason: transactionProgressObj?.failureReason,
                status: transactionProgressObj?.status,
                amount: {
                    baseAmount: cssoRecord?.paymentInfo?.joiningFee?.baseAmount,
                    discountPercentage: cssoRecord?.paymentInfo?.joiningFee?.discountPercentage,
                    finalAmount: getActualAmount(cssoRecord?.paymentInfo?.joiningFee)
                }
            },
        },
        "_id": cssoRecord._id || new ObjectId().toHexString(),
        riderId: cssoRecord?.userId,
        cityId: cssoRecord?.cityId,
        subServiceType: cssoRecord?.subServiceType,
        serviceType: cssoRecord?.serviceType,
        createdOn: transactionProgressObj?.createdOn,
        updatedAt: Date.now(),
        version: "1.0.0",
    };
    return rssoEvent;
}

async function fetchDocumentsFromDateRange(startDate, endDate, limit, cursor, conn) {
    let dbo = conn.db("users")
    let cssoModel = dbo.collection("captainSubServiceOnboarding")
    
    console.log('Method entry: fetchDocumentsFromDateRange', {startDate, endDate, limit, cursor});
    const queryOptions = {
        "_id": {
            $gte: startDate,
            $lte: endDate,
        },
        ...queryConfig.query
    };
    if (cursor) {
        console.log("Using cursor")
        queryOptions._id = {
            $gt: cursor,
            $lte: endDate,
        }
    }

    try {
        console.log({
            queryOptions
        })
        const documents = await cssoModel.find(queryOptions)
            .limit(limit)
            .sort({ _id: 1 })
            .toArray()

        console.log('Method exit: fetchDocumentsFromDateRange', {
            startDate, endDate, limit, cursor,
            foundDocs: documents.length,
        });
        return documents;
    } catch (error) {
        console.error('Error fetching documents from MongoDB:', error);
        console.error('Last cursor:', cursor);
        throw error;
    }
}

const { Kafka } = require("kafkajs");
// const { kafkaConfig, others } = require("./config");

async function processDocuments(startDate, endDate, limit) {
    let count = 0;
    console.log('Method entry: processDocuments', { startDate, endDate, limit });
    let cursor = lastCursor;
    let masterCount = 0;
    let mongoURL = mongoConfig.mongoURL
    if (!mongoConfig.useMongoURL){
        mongoURL = `mongodb://${mongoConfig.username}:${mongoConfig.password}@${mongoConfig.host}:${mongoConfig.port}/${mongoConfig.database}?authSource=users&directConnection=true`;
    }
    console.log({
        mongoURL
    })
    let conn = await MongoClient.connect(mongoURL,{
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        readPreference: 'secondaryPreferred',
    })
    try {
        while (true) {
            let localCount = 0;
            const documents = await fetchDocumentsFromDateRange(startDate, endDate, limit, cursor,conn);
            for (const document of documents) {
                console.log('---\nProcessing document init:', {
                    id: document._id,
                    masterCount,
                    localCount
                });
                let rssoEvent = createRssoEvent(document);
                rssoEvent = JSON.parse(JSON.stringify(rssoEvent))
                let message = rssoEvent
                let key = kafkaConfig.clientId
                await producer.send({
                    topic: others.KAFKA_TOPIC_RIDER_SUB_SERVICE_ONBOARDING,
                    messages: [{ key: key, value: JSON.stringify(message) }],
                });
                localCount += 1
                console.log('Processing document done:', {
                    id: document._id,
                    masterCount,
                    localCount
                });
                cursor = document._id;
            }

            lastCursor = cursor;
            masterCount += localCount

            if (documents.length < limit) {
                break;
            }
        }
        await producer.disconnect()
        console.log('Method exit: processDocuments', { startDate, endDate, limit });
        return masterCount
    } catch (error) {
        console.error('Error processing documents:', error);
        console.error('Last cursor:', lastCursor);
        console.error('Cursor:', cursor);

        throw error;
    }
}



(async () => {
    console.log('Method entry: main');
    const startDate = new ObjectId(queryConfig.start)
    const endDate = new ObjectId(queryConfig.end)
    // const startDate = (queryConfig.start)
    // const endDate = (queryConfig.end)

    const limit = queryConfig.limit
    try {
        let count = await processDocuments(startDate, endDate, limit);
        console.log('Method exit: main', { count });
    } catch (error) {
        console.error('Error in main:', error);
    }
})();