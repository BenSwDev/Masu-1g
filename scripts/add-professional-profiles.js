const { MongoClient } = require('mongodb');

async function addProfessionalProfiles() {
  const uri = "mongodb+srv://benswissa:6jHOmqKPEABnqvi3@masu-cluster.fzbdwcj.mongodb.net/?retryWrites=true&w=majority&appName=Masu-cluster";
  const client = new MongoClient(uri);

  try {
    console.log("🚀 מתחבר למסד הנתונים...");
    await client.connect();
    console.log("✅ התחברות הצליחה!");

    const db = client.db('test');
    
    const citiesCollection = db.collection('cities');
    const usersCollection = db.collection('users');
    const professionalProfilesCollection = db.collection('professionalprofiles');
    const treatmentsCollection = db.collection('treatments');

    // חיפוש משתמשים עם תפקיד professional שאין להם פרופיל
    const professionalUsers = await usersCollection.find({ 
      roles: "professional" 
    }).toArray();
    
    console.log(`נמצאו ${professionalUsers.length} משתמשים עם תפקיד professional`);
    
    const treatments = await treatmentsCollection.find({ isActive: true }).toArray();
    const cities = await citiesCollection.find({}).toArray();
    
    console.log(`נמצאו ${treatments.length} טיפולים ו-${cities.length} ערים`);

    for (const user of professionalUsers) {
      // בדיקה אם כבר יש פרופיל מטפל
      const existingProfile = await professionalProfilesCollection.findOne({ 
        userId: user._id 
      });
      
      if (existingProfile) {
        console.log(`⚠️ למשתמש ${user.name} כבר יש פרופיל מטפל`);
        continue;
      }
      
      // בחירת עיר רנדומלית למטפל
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      
      // יצירת פרופיל מטפל
      const professionalDoc = {
        userId: user._id,
        status: "active",
        isActive: true,
        professionalNumber: `P${Date.now()}${Math.floor(Math.random() * 1000)}`,
        specialization: "עיסוי רפואי ועיסוי רילקסציה",
        experience: `מטפל מוסמך עם ניסיון רב בתחום העיסוי הרפואי`,
        certifications: [
          "תעודת עיסוי רפואי",
          "תעודת עיסוי שוודי"
        ],
        bio: `מטפל מקצועי ומנוסה המתמחה בטיפולי עיסוי מותאמים אישית לכל לקוח`,
        treatments: treatments.slice(0, Math.min(2, treatments.length)).map(treatment => ({
          treatmentId: treatment._id,
          professionalPrice: treatment.fixedProfessionalPrice || 150
        })),
        workAreas: [{
          cityId: randomCity._id,
          cityName: randomCity.name,
          distanceRadius: "40km",
          coveredCities: []
        }],
        totalEarnings: 0,
        pendingPayments: 0,
        financialTransactions: [],
        adminNotes: "פרופיל מטפל שנוצר באתחול המערכת",
        appliedAt: new Date(),
        approvedAt: new Date(),
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await professionalProfilesCollection.insertOne(professionalDoc);
      console.log(`✅ נוצר פרופיל מטפל עבור: ${user.name} בעיר ${randomCity.name}`);
    }

    // סיכום סופי
    const finalProfessionalsCount = await professionalProfilesCollection.countDocuments();
    console.log(`\n🎉 סיום! כעת יש ${finalProfessionalsCount} מטפלים במערכת`);

  } catch (error) {
    console.error("❌ שגיאה:", error);
  } finally {
    await client.close();
    console.log("🔒 החיבור נסגר");
  }
}

addProfessionalProfiles(); 