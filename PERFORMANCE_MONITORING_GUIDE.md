# מדריך ניטור ביצועים - תהליכי רכישה של אורחים

## סיכום השיפורים

הוספתי לוגינג מקיף לכל תהליכי הרכישה של אורחים כדי לזהות בעיות ביצועים ב-Vercel Logs.

## 🔍 **מה נוסף:**

### 1. Request ID ייחודי לכל תהליך
```javascript
const requestId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
```
- כל בקשה מקבלת ID ייחודי למעקב מקצה לקצה
- אפשר לחפש ב-Vercel Logs: `[booking_1234567890_abc123]`

### 2. מדידת זמנים מפורטת
```javascript
phases: {
  dbConnect: "45ms",    // זמן התחברות לDB
  dataLoad: "234ms",    // טעינת נתונים
  validation: "12ms",   // בדיקת תקינות
  save: "78ms",         // שמירה בDB
  notification: "156ms" // שליחת התראות
}
```

### 3. לוגינג שגיאות משופר
```javascript
error: {
  message: "Connection timeout",
  stack: ["at function1", "at function2"]
}
```

## 📊 **אזורי הלוגינג החדשים:**

### `booking-actions.ts`
- ✅ `createBooking` - יצירת הזמנות חדשות
- ✅ `getBookingInitialDataForGuest` - טעינת נתונים ראשוניים לאורח

### `user-subscription-actions.ts` 
- ✅ `purchaseSubscription` - רכישת מנויים

### `gift-voucher-actions.ts`
- ✅ `initiatePurchaseGiftVoucher` - יצירת שוברי מתנה

## 🚨 **איך לזהות בעיות ב-Vercel Logs:**

### בעיות חיבור DB
```
[booking_1234_abc] Database connected { dbConnectTime: "5000ms" }
```
**סימן בעיה:** יותר מ-200ms

### טעינת נתונים איטית
```
[booking_1234_abc] Data loaded successfully { 
  dataLoadTime: "2000ms",
  treatmentFound: true,
  workingHoursFound: false 
}
```
**סימן בעיה:** יותר מ-500ms או `false` בשדות קריטיים

### תהליכי שמירה איטיים
```
[booking_1234_abc] Booking created successfully { 
  saveTime: "3000ms",
  bookingId: "..." 
}
```
**סימן בעיה:** יותר מ-300ms

### שגיאות validation
```
[booking_1234_abc] Validation failed { 
  validationTime: "50ms",
  errors: [...]
}
```

## 🔧 **פתרון בעיות נפוצות:**

### 1. DB איטי
- בדוק indexes על שדות: `treatmentId`, `userId`, `date`
- הוסף connection pooling
- שקול caching לנתונים שמשתנים לעיתים רחוקות

### 2. טעינת נתונים איטית
```javascript
// במקום:
const treatment = await Treatment.findById(id)
const workingHours = await WorkingHours.find({})

// עדיף:
const [treatment, workingHours] = await Promise.all([
  Treatment.findById(id),
  WorkingHours.find({}).lean()
])
```

### 3. Validation איטי
- העבר schemas מורכבים ל-compile time
- השתמש ב-`.lean()` עבור read-only data

## 📈 **מטריקות ביצועים נורמליות:**

| שלב | זמן תקין | זמן אזהרה | זמן קריטי |
|-----|----------|-----------|-----------|
| DB Connect | < 50ms | 50-200ms | > 200ms |
| Data Load | < 200ms | 200-500ms | > 500ms |
| Validation | < 30ms | 30-100ms | > 100ms |
| Save | < 100ms | 100-300ms | > 300ms |
| Notification | < 200ms | 200-500ms | > 500ms |
| **סה"כ** | < 500ms | 500-1500ms | > 1500ms |

## 🔍 **חיפוש ב-Vercel Logs:**

### לראות תהליך שלם:
```
[booking_1234567890_abc123]
```

### לראות שגיאות בלבד:
```
level:error [booking_
```

### לראות תהליכים איטיים:
```
"totalTime.*[2-9][0-9]{3}ms"
```

### לראות בעיות DB:
```
"dbConnectTime.*[2-9][0-9]{2}ms"
```

## 🎯 **המלצות לשיפור:**

1. **הוסף caching** לטיפולים ושעות עבודה
2. **אופטימיזציה של DB queries** עם indexes
3. **החלף ל-MongoDB Atlas** עם regions קרובים יותר
4. **הוסף Redis** עבור session management
5. **שקול CDN** עבור נתונים סטטיים

---

**עכשיו אפשר לראות בדיוק איפה המערכת איטית ולתקן בהתאם! 🚀** 