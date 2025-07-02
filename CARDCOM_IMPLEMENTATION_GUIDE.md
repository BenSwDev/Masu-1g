# מדריך יישום מערכת CARDCOM - מושלם ומוכן לייצור

## סקירה כללית

מערכת תשלומים מושלמת המשולבת עם CARDCOM, כוללת:
- תשלומים מאובטחים עם יצירת טוקנים
- חיובים וזיכויים ישירים
- מעקב מלא אחר תשלומים
- ממשק מנהל מתקדם
- טיפול בשגיאות מקיף

## מבנה הקבצים שנוצרו

```
lib/
├── db/models/
│   └── payment.ts                 # מודל MongoDB לתשלומים
├── services/
│   └── cardcom-service.ts         # שירות CARDCOM המרכזי
app/
├── api/payments/
│   ├── create/route.ts           # יצירת תשלום חדש
│   ├── callback/route.ts         # עיבוד תוצאות מ-CARDCOM
│   └── direct/route.ts           # חיובים/זיכויים ישירים
├── payment/
│   ├── success/page.tsx          # דף הצלחת תשלום
│   └── error/page.tsx            # דף שגיאת תשלום
components/
├── booking/steps/
│   └── guest-payment-step.tsx    # רכיב תשלום מעודכן
└── dashboard/admin/payments/
    └── direct-payment-modal.tsx  # רכיב חיובים/זיכויים למנהלים
```

## הגדרת משתני סביבה

צור קובץ `.env.local` עם המשתנים הבאים:

```env
# CARDCOM Configuration
CARDCOM_TERMINAL_NUMBER=your-terminal-number
CARDCOM_USERNAME=your-username  
CARDCOM_API_KEY=your-api-key
CARDCOM_BASE_URL=https://secure.cardcom.solutions
CARDCOM_TEST_MODE=true

# Payment URLs
PAYMENT_SUCCESS_URL=https://yourdomain.com/payment/success
PAYMENT_ERROR_URL=https://yourdomain.com/payment/error

# Encryption key for token storage (32 characters)
CARDCOM_ENCRYPTION_KEY=your-32-character-encryption-key
```

## תכונות המערכת

### 1. תשלומים בסיסיים
- יצירת תשלום חדש ב-CARDCOM
- הפניה לדף תשלום מאובטח
- קבלת תוצאות והחזרה לאתר
- שמירת טוקן לשימוש עתידי

### 2. חיובים וזיכויים ישירים
- חיוב נוסף באמצעות טוקן שמור
- זיכוי/החזר כספי
- ממשק מנהל נוח
- מעקב מלא אחר הפעולות

### 3. ניהול תשלומים
- מעקב סטטוס תשלומים
- היסטוריית תשלומים מלאה
- לוגים מפורטים
- טיפול בשגיאות מתקדם

### 4. אבטחה
- הצפנת נתוני טוקן
- ולידציות מקיפות
- הגנה מפני CSRF
- לוגים בטוחים (ללא נתונים רגישים)

## זרימת תשלום בסיסית

1. **יצירת תשלום**: משתמש לוחץ "שלם כעת"
2. **קריאה ל-API**: `/api/payments/create`
3. **יצירה ב-CARDCOM**: שליחת נתונים ל-CARDCOM
4. **הפניה**: משתמש מועבר לדף CARDCOM
5. **תשלום**: משתמש מזין פרטי כרטיס
6. **החזרה**: CARDCOM מחזיר ל-callback
7. **עיבוד**: `/api/payments/callback` מעבד תוצאות
8. **הצגה**: הפניה לדף הצלחה/שגיאה

## זרימת חיוב/זיכוי ישיר

1. **בחירת הזמנה**: מנהל בוחר הזמנה עם תשלום קיים
2. **פתיחת מודל**: לחיצה על "חיוב/זיכוי"
3. **מילוי פרטים**: סכום, תיאור, סוג פעולה
4. **קריאה ל-API**: `/api/payments/direct`
5. **חיפוש טוקן**: מציאת טוקן מהתשלום המקורי
6. **ביצוע ב-CARDCOM**: שימוש בטוקן לחיוב/זיכוי
7. **עדכון מסד נתונים**: שמירת פעולה חדשה
8. **הצגת תוצאה**: הודעת הצלחה/שגיאה

## API Routes

### POST /api/payments/create
יוצר תשלום חדש ב-CARDCOM

**Body:**
```json
{
  "bookingId": "booking-id",
  "amount": 150.00,
  "description": "הזמנת טיפול",
  "customerName": "שם הלקוח",
  "customerEmail": "email@example.com",
  "customerPhone": "0501234567"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment-uuid",
  "redirectUrl": "https://secure.cardcom.solutions/..."
}
```

### GET/POST /api/payments/callback
מעבד תוצאות תשלום מ-CARDCOM

**Query Parameters:**
- `status`: success/error
- `paymentId`: מזהה התשלום
- `complete`: 1/0
- `token`: טוקן מ-CARDCOM
- `sum`: סכום
- `returnValue`: מזהה שהוחזר

### POST /api/payments/direct
מבצע חיוב/זיכוי ישיר עם טוקן

**Body:**
```json
{
  "bookingId": "booking-id",
  "amount": 50.00,
  "description": "חיוב נוסף",
  "action": "charge", // או "refund"
  "originalPaymentId": "original-payment-id"
}
```

## מודל MongoDB

### Payment Schema
```typescript
{
  _id: string              // UUID
  order_id: string         // מזהה הזמנה
  booking_id?: string      // קישור להזמנה
  pay_type: "ccard" | "refund" | "cash"
  sub_type: "direct" | "token" | "manual"
  start_time: Date         // תחילת תשלום
  end_time?: Date          // סיום תשלום
  sum: number              // סכום
  complete: boolean        // האם הושלם
  has_token: boolean       // האם יש טוקן
  transaction_id?: string  // מזהה עסקה
  cardcom_internal_deal_number?: string
  input_data?: any         // נתוני קלט
  result_data?: any        // תגובה מ-CARDCOM
  created_at: Date
  updated_at: Date
}
```

## רכיבי UI

### GuestPaymentStep
רכיב תשלום מעודכן שמשתמש ב-CARDCOM האמיתי במקום דמיה

### DirectPaymentModal
רכיב למנהלים לביצוע חיובים/זיכויים ישירים

### דפי תוצאות
- `/payment/success` - דף הצלחת תשלום
- `/payment/error` - דף שגיאת תשלום

## אבטחה ומיטבים

### הצפנת טוקנים
```typescript
// הצפנה
const encryptedToken = cardcomService.encryptTokenData(tokenData)

// פענוח
const decryptedToken = cardcomService.decryptTokenData(encryptedData)
```

### לוגים בטוחים
```typescript
// ✅ בטוח - ללא נתונים רגישים
logger.info("Payment created", { paymentId, amount, bookingId })

// ❌ לא בטוח - חושף טוקן
logger.info("Token received", { token: fullToken })
```

### ולידציות
- בדיקת פרמטרים נדרשים
- ולידציית סכומים
- בדיקת הרשאות משתמש
- אימות מקור הקריאה

## טיפול בשגיאות

### שגיאות CARDCOM נפוצות
- `"1"` - פרמטר חסר או לא תקין
- `"2"` - שגיאה בחיבור למסד נתונים
- `"3"` - אין הרשאה לביצוע הפעולה
- `"700"` - כרטיס נדחה

### שגיאות מקומיות
- חיפוש טוקן נכשל
- הזמנה לא נמצאה
- סכום לא תקין
- שגיאת רשת

## בדיקות ואימותים

### בדיקות בסיסיות
1. ✅ יצירת תשלום חדש
2. ✅ עיבוד callback מוצלח
3. ✅ עיבוד callback נכשל
4. ✅ חיוב ישיר עם טוקן
5. ✅ זיכוי ישיר עם טוקן

### בדיקות אבטחה
1. ✅ הצפנת/פענוח טוקנים
2. ✅ ולידציית פרמטרים
3. ✅ הגנה מפני CSRF
4. ✅ לוגים בטוחים

### בדיקות שגיאות
1. ✅ טיפול בשגיאות CARDCOM
2. ✅ טיפול בשגיאות רשת
3. ✅ טיפול בנתונים חסרים
4. ✅ timeout handling

## פריסה לייצור

### שלבי הפריסה
1. **הגדרת משתני סביבה** בפלטפורמת הפריסה
2. **עדכון URLs** לכתובות הייצור
3. **שינוי CARDCOM_TEST_MODE** ל-`false`
4. **בדיקת חיבור** למסד נתונים
5. **בדיקת תשלום מבחן** בסביבת הייצור

### מעקב ותחזוקה
- מעקב לוגים בזמן אמת
- התראות על שגיאות תשלום
- גיבוי מסד נתונים יומי
- עדכון אבטחה שוטף

## תמיכה ופתרון בעיות

### בעיות נפוצות
1. **תשלום לא מושלם** - בדוק לוגים ב-`/logs`
2. **טוקן לא נמצא** - ודא שהתשלום המקורי הושלם בהצלחה
3. **שגיאת הצפנה** - בדוק את `CARDCOM_ENCRYPTION_KEY`
4. **callback לא מגיע** - ודא שה-URLs נכונים

### לוגים חשובים
```bash
# תשלומים חדשים
grep "Payment created" logs/

# תשלומים מושלמים
grep "Payment completed" logs/

# שגיאות CARDCOM
grep "CARDCOM error" logs/

# חיובים ישירים
grep "Direct charge" logs/
```

## סיכום

המערכת מיושמת במלואה וכוללת:
- ✅ תשלומים מאובטחים עם CARDCOM
- ✅ חיובים וזיכויים ישירים
- ✅ ממשק מנהל מתקדם
- ✅ טיפול בשגיאות מקיף
- ✅ אבטחה מתקדמת
- ✅ לוגים מפורטים
- ✅ תיעוד מלא

המערכת מוכנה לייצור ויכולה להתחיל לעבוד מיד לאחר הגדרת משתני הסביבה. 