const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const uri = "mongodb+srv://benswissa:6jHOmqKPEABnqvi3@masu-cluster.fzbdwcj.mongodb.net/?retryWrites=true&w=majority&appName=Masu-cluster";
  const client = new MongoClient(uri);

  try {
    // was console log"🚀 מתחבר למסד הנתונים...");
    await client.connect();
    // was console log"✅ התחברות הצליחה!");

    // רשימת כל מסדי הנתונים
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    // was console log"\n📊 מסדי נתונים זמינים:");
    dbs.databases.forEach(db => {
      // was console log`  - ${db.name} (${Math.round(db.sizeOnDisk / 1024 / 1024 * 100) / 100} MB)`);
    });

    // בדיקת מסד הנתונים 'test'
    // was console log"\n🔍 בודק מסד נתונים 'test':");
    const testDb = client.db('test');
    const collections = await testDb.listCollections().toArray();
    
    // was console log"אוספים במסד 'test':");
    for (const collection of collections) {
      const count = await testDb.collection(collection.name).countDocuments();
      // was console log`  - ${collection.name}: ${count} מסמכים`);
    }

    // בדיקה מפורטת של כל אוסף
    const collectionNames = ['cities', 'citydistances', 'users', 'professionalprofiles', 'treatments'];
    
    for (const collName of collectionNames) {
      // was console log`\n📋 בודק אוסף '${collName}':`);
      const coll = testDb.collection(collName);
      const count = await coll.countDocuments();
      // was console log`  כמות מסמכים: ${count}`);
      
      if (count > 0) {
        const sample = await coll.findOne();
        // was console log`  דוגמה למסמך:`, JSON.stringify(sample, null, 2).substring(0, 200) + "...");
      }
    }

    // אם אין נתונים ב-test, בואו נבדוק מסדי נתונים אחרים
    if (collections.length === 0) {
      // was console log"\n⚠️ לא נמצאו אוספים במסד 'test', בודק מסדי נתונים אחרים...");
      
      for (const db of dbs.databases) {
        if (db.name !== 'admin' && db.name !== 'local' && db.name !== 'test') {
          // was console log`\n🔍 בודק מסד נתונים '${db.name}':`);
          const otherDb = client.db(db.name);
          const otherCollections = await otherDb.listCollections().toArray();
          
          for (const collection of otherCollections) {
            const count = await otherDb.collection(collection.name).countDocuments();
            // was console log`  - ${collection.name}: ${count} מסמכים`);
          }
        }
      }
    }

  } catch (error) {
    console.error("❌ שגיאה:", error);
  } finally {
    await client.close();
    // was console log"\n🔒 החיבור נסגר");
  }
}

checkDatabase(); 