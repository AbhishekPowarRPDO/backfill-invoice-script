const mongoose = require('mongoose');
const {mongoConfig} = require("./config");
var Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId

// MongoDB model schema

// Construct MongoDB connection URL
let mongoURL = mongoConfig.mongoURL
if (!mongoConfig.useMongoURL){
    mongoURL = `mongodb://${mongoConfig.username}:${mongoConfig.password}@${mongoConfig.host}:${mongoConfig.port}/${mongoConfig.database}`;
}

// const conn = mongoose.createConnection(mongoConfig.mongoURL);
// const MyModel = conn.model('ModelName', schema);
// let db = mongoose.connection

var db = mongoose.createConnection(mongoURL, function (error) {
    if (error) {
        console.log({
            message: " Mongo connection error",
            data: {
                mongoURL
            },
            error: error
        });        
    } else {
        console.log({
            message: "Connected to MongoDb ",
            data: {
                mongoURL
            }            
        });        
    }
});

mongoose.connection.on('open', function (ref) {
    console.log('Connected to mongo server.');
    //trying to get collection names
    mongoose.connection.db.listCollections().toArray(function (err, names) {
        console.log(names); // [{ name: 'dbname.myCollection' }]
        module.exports.Collection = names;
    });
})

const cssoRecordSchema = new Schema({
    _id: ObjectId,
    userId: ObjectId,
    cityId: ObjectId,
    subServiceType: String,
    serviceType: String,
    paymentInfo: {
        joiningFee: {
            baseAmount: Number,
            discountPercentage: Number,
            transactionProgress: [{
                correlationId: String,
                paymentId: String,
                status: String,
                failureReason: String,
                modifiedOn: Number,
                createdOn: Number,
                modifiedBy: String
            }]
        }
    }
}, { collection: mongoConfig.collection });

console.log({
    mongoURL
})

exports.cssoModel  = mongoose.model("captainSubServiceOnboarding",cssoRecordSchema)
