const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// רשימת 30 הערים הראשיות בישראל
const ISRAEL_CITIES = [
  { name: "תל אביב", lat: 32.0853, lng: 34.7818 },
  { name: "ירושלים", lat: 31.7683, lng: 35.2137 },
  { name: "חיפה", lat: 32.7940, lng: 34.9896 },
  { name: "ראשון לציון", lat: 31.9730, lng: 34.8047 },
  { name: "אשדוד", lat: 31.7940, lng: 34.6426 },
  { name: "נתניה", lat: 32.3215, lng: 34.8532 },
  { name: "באר שבע", lat: 31.2530, lng: 34.7915 },
  { name: "בני ברק", lat: 32.0969, lng: 34.8263 },
  { name: "חולון", lat: 32.0104, lng: 34.7694 },
  { name: "רמת גן", lat: 32.0820, lng: 34.8252 },
  { name: "אשקלון", lat: 31.6688, lng: 34.5742 },
  { name: "רחובות", lat: 31.8969, lng: 34.8186 },
  { name: "בת ים", lat: 32.0204, lng: 34.7509 },
  { name: "כפר סבא", lat: 32.1742, lng: 34.9063 },
  { name: "הרצליה", lat: 32.1624, lng: 34.8443 },
  { name: "חדרה", lat: 32.4343, lng: 34.9181 },
  { name: "מודיעין", lat: 31.8926, lng: 35.0095 },
  { name: "רעננה", lat: 32.1847, lng: 34.8717 },
  { name: "פתח תקווה", lat: 32.0878, lng: 34.8878 },
  { name: "גבעתיים", lat: 32.0678, lng: 34.8098 },
  { name: "קריית אתא", lat: 32.8098, lng: 35.1013 },
  { name: "עכו", lat: 32.9215, lng: 35.0818 },
  { name: "אילת", lat: 29.5581, lng: 34.9482 },
  { name: "נהריה", lat: 33.0078, lng: 35.0950 },
  { name: "טבריה", lat: 32.7922, lng: 35.5312 },
  { name: "צפת", lat: 32.9648, lng: 35.4956 },
  { name: "קריית גת", lat: 31.6100, lng: 34.7642 },
  { name: "דימונה", lat: 31.0695, lng: 35.0323 },
  { name: "קריית שמונה", lat: 33.2074, lng: 35.5695 },
  { name: "לוד", lat: 31.9516, lng: 34.8969 }
];

// טיפולים לדוגמה
const SAMPLE_TREATMENTS = [
  {
    name: "עיסוי שוודי מרגיע",
    category: "massages",
    description: "עיסוי מרגיע ומרענן המבוסס על טכניקות עיסוי שוודיות קלאסיות",
    pricingType: "fixed",
    fixedPrice: 200,
    fixedProfessionalPrice: 150,
    defaultDurationMinutes: 60,
    allowTherapistGenderSelection: true,
    isActive: true
  },
  {
    name: "עיסוי רקמות עמוקות",
    category: "massages", 
    description: "עיסוי טיפולי לשחרור מתח ולכאבי שרירים",
    pricingType: "fixed",
    fixedPrice: 250,
    fixedProfessionalPrice: 180,
    defaultDurationMinutes: 75,
    allowTherapistGenderSelection: true,
    isActive: true
  },
  {
    name: "עיסוי רילקסציה",
    category: "massages",
    description: "עיסוי עדין ומרגיע להפגת מתח וחרדה",
    pricingType: "fixed", 
    fixedPrice: 180,
    fixedProfessionalPrice: 130,
    defaultDurationMinutes: 60,
    allowTherapistGenderSelection: true,
    isActive: true
  }
];

// מטפלים לדוגמה
const SAMPLE_PROFESSIONALS = [
  {
    name: "ד\"ר שרה כהן",
    email: "sarah.cohen@masu.co.il",
    phone: "0508888881",
    gender: "female",
    specialization: "עיסוי רפואי ועיסוי נשים",
    experience: "מטפלת מוסמכת עם ניסיון של 10 שנים בעיסוי רפואי ועיסוי לנשים",
    cityName: "תל אביב"
  },
  {
    name: "ד\"ר יוסי לוי",
    email: "yossi.levy@masu.co.il", 
    phone: "0508888882",
    gender: "male",
    specialization: "עיסוי ספורט ורקמות עמוקות",
    experience: "מטפל מוסמך עם ניסיון של 8 שנים בעיסוי ספורט",
    cityName: "חיפה"
  },
  {
    name: "ד\"ר מיכל אברהם",
    email: "michal.abraham@masu.co.il",
    phone: "0508888883", 
    gender: "female",
    specialization: "עיסוי רילקסציה וטיפול הוליסטי",
    experience: "מטפלת מוסמכת עם ניסיון של 6 שנים בעיסוי רילקסציה",
    cityName: "ירושלים"
  }
];

// חישוב מרחק בין שתי נקודות
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // רדיוס כדור הארץ בקילומטרים
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 100) / 100;
}

async function populateDatabase() {
  const uri = "mongodb+srv://benswissa:6jHOmqKPEABnqvi3@masu-cluster.fzbdwcj.mongodb.net/?retryWrites=true&w=majority&appName=Masu-cluster";
  const client = new MongoClient(uri);

  try {
    console.log("🚀 מתחבר למסד הנתונים...");
    await client.connect();
    console.log("✅ התחברות הצליחה!");

    const db = client.db('test'); // או שם מסד הנתונים שלך
    
    // יצירת אוספים
    const citiesCollection = db.collection('cities');
    const cityDistancesCollection = db.collection('citydistances');
    const usersCollection = db.collection('users');
    const professionalProfilesCollection = db.collection('professionalprofiles');
    const treatmentsCollection = db.collection('treatments');

    console.log("📍 יוצר ערים...");
    
    // בדיקה אם ערים כבר קיימות
    const existingCitiesCount = await citiesCollection.countDocuments();
    
    if (existingCitiesCount === 0) {
      // יצירת ערים
      const cityDocs = ISRAEL_CITIES.map(city => ({
        name: city.name,
        coordinates: {
          lat: city.lat,
          lng: city.lng
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const insertedCities = await citiesCollection.insertMany(cityDocs);
      console.log(`✅ נוצרו ${insertedCities.insertedCount} ערים`);

      // חישוב מרחקים בין ערים
      console.log("📏 מחשב מרחקים בין ערים...");
      const cities = await citiesCollection.find({}).toArray();
      
      const distanceDocs = [];
      for (let i = 0; i < cities.length; i++) {
        for (let j = i + 1; j < cities.length; j++) {
          const city1 = cities[i];
          const city2 = cities[j];
          
          const distance = calculateDistance(
            city1.coordinates.lat,
            city1.coordinates.lng,
            city2.coordinates.lat,
            city2.coordinates.lng
          );
          
          // שני כיוונים
          distanceDocs.push(
            {
              fromCityId: city1._id,
              toCityId: city2._id,
              fromCityName: city1.name,
              toCityName: city2.name,
              distanceKm: distance,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              fromCityId: city2._id,
              toCityId: city1._id,
              fromCityName: city2.name,
              toCityName: city1.name,
              distanceKm: distance,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          );
        }
      }
      
      if (distanceDocs.length > 0) {
        await cityDistancesCollection.insertMany(distanceDocs);
        console.log(`✅ נוצרו ${distanceDocs.length} קשרי מרחק`);
      }
    } else {
      console.log("📍 ערים כבר קיימות, מדלג...");
    }

    // יצירת טיפולים
    console.log("💆‍♀️ יוצר טיפולים...");
    const existingTreatmentsCount = await treatmentsCollection.countDocuments();
    
    if (existingTreatmentsCount === 0) {
      const treatmentDocs = SAMPLE_TREATMENTS.map(treatment => ({
        ...treatment,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const insertedTreatments = await treatmentsCollection.insertMany(treatmentDocs);
      console.log(`✅ נוצרו ${insertedTreatments.insertedCount} טיפולים`);
    } else {
      console.log("💆‍♀️ טיפולים כבר קיימים, מדלג...");
    }

    // יצירת מטפלים
    console.log("👨‍⚕️ יוצר מטפלים...");
    const existingProfessionalsCount = await professionalProfilesCollection.countDocuments();
    
    if (existingProfessionalsCount === 0) {
      const treatments = await treatmentsCollection.find({ isActive: true }).toArray();
      const cities = await citiesCollection.find({}).toArray();
      
      for (const prof of SAMPLE_PROFESSIONALS) {
        // בדיקה אם המשתמש כבר קיים
        const existingUser = await usersCollection.findOne({ 
          $or: [
            { email: prof.email },
            { phone: prof.phone }
          ]
        });
        
        if (existingUser) {
          console.log(`⚠️ משתמש ${prof.name} כבר קיים, מדלג...`);
          continue;
        }
        
        // יצירת משתמש
        const hashedPassword = await bcrypt.hash("Demo123456!", 10);
        
        const userDoc = {
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          password: hashedPassword,
          gender: prof.gender,
          roles: ["professional"],
          activeRole: "professional",
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const insertedUser = await usersCollection.insertOne(userDoc);
        
        // מציאת העיר
        const city = cities.find(c => c.name === prof.cityName);
        
        if (city) {
          // יצירת פרופיל מטפל
          const professionalDoc = {
            userId: insertedUser.insertedId,
            status: "active",
            isActive: true,
            specialization: prof.specialization,
            experience: prof.experience,
            certifications: [
              "תעודת עיסוי רפואי",
              "תעודת עיסוי שוודי"
            ],
            bio: prof.experience,
            treatments: treatments.slice(0, 2).map(treatment => ({
              treatmentId: treatment._id,
              professionalPrice: treatment.fixedProfessionalPrice || 150
            })),
            workAreas: [{
              cityId: city._id,
              cityName: city.name,
              distanceRadius: "40km",
              coveredCities: []
            }],
            totalEarnings: 0,
            pendingPayments: 0,
            financialTransactions: [],
            adminNotes: "מטפל לדוגמא שנוצר באתחול המערכת",
            appliedAt: new Date(),
            approvedAt: new Date(),
            lastActiveAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await professionalProfilesCollection.insertOne(professionalDoc);
          console.log(`✅ נוצר מטפל: ${prof.name} בעיר ${prof.cityName}`);
        }
      }
    } else {
      console.log("👨‍⚕️ מטפלים כבר קיימים, מדלג...");
    }

    console.log("🎉 האתחול הושלם בהצלחה!");

  } catch (error) {
    console.error("❌ שגיאה באתחול:", error);
  } finally {
    await client.close();
    console.log("🔒 החיבור למסד הנתונים נסגר");
  }
}

// הרצת הסקריפט
populateDatabase(); 