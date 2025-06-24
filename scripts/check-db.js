const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const uri = "mongodb+srv://benswissa:6jHOmqKPEABnqvi3@masu-cluster.fzbdwcj.mongodb.net/?retryWrites=true&w=majority&appName=Masu-cluster";
  const client = new MongoClient(uri);

  try {
    // TODO: Remove debug log

    await client.connect();
    // TODO: Remove debug log


    // רשימת כל מסדי הנתונים
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    // TODO: Remove debug log

    dbs.databases.forEach(db => {
      // TODO: Remove debug log
 / 100} MB)`);
    });

    // בדיקת מסד הנתונים 'test'
    // TODO: Remove debug log

    const testDb = client.db('test');
    const collections = await testDb.listCollections().toArray();
    
    // TODO: Remove debug log

    for (const collection of collections) {
      const count = await testDb.collection(collection.name).countDocuments();
      // TODO: Remove debug log

    }

    // בדיקה מפורטת של כל אוסף
    const collectionNames = ['cities', 'citydistances', 'users', 'professionalprofiles', 'treatments'];
    
    for (const collName of collectionNames) {
      // TODO: Remove debug log

      const coll = testDb.collection(collName);
      const count = await coll.countDocuments();
      // TODO: Remove debug log

      
      if (count > 0) {
        const sample = await coll.findOne();
        // TODO: Remove debug log
.substring(0, 200) + "...");
      }
    }

    // אם אין נתונים ב-test, בואו נבדוק מסדי נתונים אחרים
    if (collections.length === 0) {
      // TODO: Remove debug log

      
      for (const db of dbs.databases) {
        if (db.name !== 'admin' && db.name !== 'local' && db.name !== 'test') {
          // TODO: Remove debug log

          const otherDb = client.db(db.name);
          const otherCollections = await otherDb.listCollections().toArray();
          
          for (const collection of otherCollections) {
            const count = await otherDb.collection(collection.name).countDocuments();
            // TODO: Remove debug log

          }
        }
      }
    }

  } catch (error) {
    console.error("❌ שגיאה:", error);
  } finally {
    await client.close();
    // TODO: Remove debug log

  }
}

checkDatabase(); 