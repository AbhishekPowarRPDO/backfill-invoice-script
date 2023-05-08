const {mongoConfig} = require("./config");




var MongoClient = require('mongodb').MongoClient;



(async ()=>{
    const uri = "mongodb://root:password@mongodb-v4-1.db.staging.internal:27017";
    console.log({
        mongoConfig
    })
    
    let conn = await MongoClient.connect(uri)
    let {db:dbName, collection:collectionName}=mongoConfig
    let dbo = conn.db("users")
    let collection = dbo.collection("captainSubServiceOnboarding")
    let x = await collection.find({}).limit(3).toArray()
    console.log(x)
    // function(err, db) {
    //     if (err) throw err;
    //     var dbo = db.db("b2b");
    //     console.log(
    //         {
    //             dbo
    //         }
    //     )
    //     dbo.collection("deliveryOrders").find({}, {}).toArray(function(err, result) {
    //       if (err) throw err;
    //       console.log(result);
    //       db.close();
    //     });
    //   });

    console.log("End")
    
})()

exports.conn = MongoClient.connect(uri)