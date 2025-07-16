# מערכת תשלומים CARDCOM - הסבר מפורט על בסיס הקוד

## סקירה כללית

מערכת התשלומים במאסו משתמשת ב-**CARDCOM Low Profile API** - שירות תשלומים ישראלי שמאפשר הצגת iframe עם טופס תשלום מאובטח ישירות באתר.

## רכיבי המערכת

### 1. שירות CARDCOM הראשי (`lib/services/cardcom-service.ts`)

**הגדרות השירות:**
```typescript
terminal: "125566"
apiToken: "Q3ZqTMTZGrSIKjktQrfN"
baseUrl: "https://secure.cardcom.solutions/api/v11"
testMode: false (כרגע כפוי למצב פרודקשן)
```

**פונקציות מרכזיות:**
- `createLowProfilePayment()` - יצירת תשלום iframe
- `chargeToken()` - חיוב עם טוקן קיים
- `chargeCard()` - חיוב ישיר עם פרטי כרטיס
- `refund()` - החזר כספי

### 2. API ליצירת תשלום (`app/api/payments/create/route.ts`)

**תפקיד:** מקבל בקשת תשלום מהקליינט ויוצר תשלום ב-CARDCOM

**פרמטרים נדרשים:**
- `bookingId` - מזהה הזמנה
- `amount` - סכום לתשלום
- `description` - תיאור התשלום
- `customerName`, `customerEmail`, `customerPhone` - פרטי לקוח

### 3. Callback Handler (`app/api/payments/callback/route.ts`)

**תפקיד:** מקבל תוצאות תשלום מ-CARDCOM ומעדכן את המערכת

### 4. רכיב iframe התשלום (`components/common/purchase/payment-iframe.tsx`)

**תפקיד:** מציג את iframe של CARDCOM ומאזין להודעות

### 5. שלב התשלום (`components/booking/steps/guest-payment-step.tsx`)

**תפקיד:** ממשק המשתמש לתהליך התשלום

## תהליך התשלום המפורט - מה באמת קורה

### שלב 1: הכנת הזמנה
```typescript
// ב-guest-payment-step.tsx
const handlePayNow = async () => {
  // יצירת הזמנה pending אם לא קיימת
  let finalBookingId = pendingBookingId;
  if (createPendingBooking && !finalBookingId) {
    finalBookingId = await createPendingBooking();
  }
}
```

**מה קורה:**
1. אם אין booking ID - יוצרת הזמנה עם סטטוס `pending_payment`
2. הזמנה נשמרת ב-MongoDB עם כל הפרטים חוץ מתשלום

### שלב 2: יצירת תשלום ב-CARDCOM
```typescript
// קריאה ל-API
const paymentResponse = await fetch('/api/payments/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingId: finalBookingId,
    amount: calculatedPrice?.finalAmount || 0,
    description: description,
    customerName: `${guestInfo.firstName} ${guestInfo.lastName}`,
    customerEmail: guestInfo.email,
    customerPhone: guestInfo.phone,
    type: purchaseType
  })
});
```

**מה קורה ב-API:**
1. **יצירת מזהה תשלום ייחודי:**
   ```typescript
   const paymentId = crypto.randomUUID()
   ```

2. **שמירת רשומת תשלום ב-MongoDB:**
   ```typescript
   const payment = new Payment({
     _id: paymentId,
     order_id: bookingId,
     booking_id: bookingId,
     sum: amount,
     pay_type: "ccard",
     sub_type: "token",
     start_time: new Date()
   })
   ```

3. **הכנת URLs לתוצאות:**
   ```typescript
   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
   const successUrl = `${baseUrl}/api/payments/callback?status=success&paymentId=${paymentId}`
   const errorUrl = `${baseUrl}/api/payments/callback?status=error&paymentId=${paymentId}`
   ```

4. **קריאה ל-CARDCOM API:**
   ```typescript
   const cardcomResult = await cardcomService.createLowProfilePayment({
     amount,
     description,
     paymentId,
     customerName,
     customerEmail,
     customerPhone,
     successUrl,
     errorUrl
   })
   ```

### שלב 3: תגובת CARDCOM
**אם הצליח:**
- CARDCOM מחזיר `responseCode: "0"` 
- מחזיר `url` - הכתובת של iframe התשלום
- מחזיר `LowProfileCode` - מזהה עסקה פנימי

**תגובה אופיינית:**
```json
{
  "success": true,
  "paymentId": "uuid-here",
  "redirectUrl": "https://secure.cardcom.solutions/Interface/LowProfile.aspx?[params]",
  "lowProfileCode": "CARD123456"
}
```

### שלב 4: הצגת iframe התשלום
```typescript
// ב-guest-payment-step.tsx
if (paymentData.success && paymentData.redirectUrl) {
  setPaymentUrl(paymentData.redirectUrl); // מציג את ה-iframe
}
```

**מה המשתמש רואה:**
1. טופס תשלום של CARDCOM נטען ב-iframe
2. שדות לפרטי כרטיס אשראי: מספר, תוקף, CVV, שם בעל הכרטיס
3. כפתור "שלם" 

### שלב 5: העברת פרטי כרטיס ועיבוד תשלום
**מה קורה ב-CARDCOM:**
1. משתמש מזין פרטי כרטיס אשראי
2. CARDCOM מבצע אימות עם חברת האשראי
3. אם אושר - חיוב בפועל
4. אם נדחה - הודעת שגיאה

### שלב 6: תוצאות התשלום והפניה
**בהצלחה:**
```
GET /api/payments/callback?status=success&paymentId=UUID&complete=1&token=1&sum=370&InternalDealNumber=12345&Last4=1234
```

**בכישלון:**
```
GET /api/payments/callback?status=error&paymentId=UUID&complete=0&reason=card_declined
```

### שלב 7: עיבוד Callback
```typescript
// ב-app/api/payments/callback/route.ts
export async function GET(request: NextRequest) {
  // חילוץ פרמטרים
  const status = searchParams.get("status")
  const paymentId = searchParams.get("paymentId")
  const complete = searchParams.get("complete")
  const internalDealNumber = searchParams.get("InternalDealNumber")
  
  // חיפוש רשומת התשלום
  const payment = await Payment.findById(paymentId)
  
  const isSuccess = status === "success" && complete === "1"
  
  // עדכון רשומת התשלום
  await Payment.findByIdAndUpdate(paymentId, {
    complete: isSuccess,
    end_time: new Date(),
    transaction_id: internalDealNumber,
    result_data: { status, complete, sum, ... }
  })
  
  // עדכון סטטוס הזמנה
  if (payment.booking_id) {
    await updateBookingStatusAfterPayment(
      payment.booking_id,
      isSuccess ? "success" : "failed",
      internalDealNumber
    )
  }
}
```

### שלב 8: עדכון סטטוס הזמנה
```typescript
// ב-updateBookingStatusAfterPayment
await mongooseDbSession.withTransaction(async () => {
  if (paymentStatus === "success") {
    // הזמנה אושרה - עדכון ל-"confirmed"
    booking.status = "confirmed"
    booking.paymentDetails.paymentStatus = "paid"
    booking.paymentDetails.transactionId = transactionId
    
    // שליחת הודעות לקוחות ומטפלים
    await sendBookingConfirmationNotifications(booking)
    
  } else {
    // תשלום נכשל - החזרת מימושים
    booking.status = "payment_failed"
    booking.paymentDetails.paymentStatus = "failed"
    
    // החזרת מנוי/קופון/שובר שנוצל
    await rollbackRedemptions(booking)
  }
})
```

## הגדרות משתני סביבה נדרשות

```env
# CARDCOM
CARDCOM_TERMINAL=125566
CARDCOM_API_TOKEN=Q3ZqTMTZGrSIKjktQrfN
CARDCOM_BASE_URL=https://secure.cardcom.solutions/api/v11
CARDCOM_TEST_MODE=false

# כתובות האפליקציה
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## מצבי שגיאה אפשריים

### 1. שגיאות הגדרה
- חסרים משתני סביבה של CARDCOM
- בעיית חיבור ל-CARDCOM API

### 2. שגיאות תשלום
- כרטיס נדחה
- יתרה לא מספקת  
- פרטי כרטיס שגויים
- כרטיס חסום

### 3. שגיאות מערכת
- בעיה ביצירת הזמנה
- שגיאת רשת
- timeout

## איך לבדוק שהכל עובד

### 1. בדיקת לוגים
```typescript
// ב-CARDCOM service
logger.info("CARDCOM Service initialized", {
  terminal: this.config.terminal,
  hasApiToken: !!this.config.apiToken,
  baseUrl: this.config.baseUrl,
  testMode: this.config.testMode
})
```

### 2. מעקב אחר תהליך התשלום
1. לחפש בלוגים: "Creating CARDCOM Low Profile payment"
2. לוודא קבלת `responseCode: "0"` מ-CARDCOM
3. לוודא שה-iframe נטען עם URL חוקי
4. לבדוק callback עם status=success

### 3. בדיקת עדכון הזמנה
- סטטוס השתנה מ-`pending_payment` ל-`confirmed`
- `paymentDetails.paymentStatus` = "paid"
- `paymentDetails.transactionId` מולא

## סכום

המערכת כרגע מוגדרת ל**מצב פרודקשן** ואמורה לעבוד עם תשלומים אמיתיים. התהליך כולל:

1. **יצירת הזמנה** עם סטטוס pending
2. **קריאה ל-CARDCOM** ליצירת iframe תשלום  
3. **הצגת iframe** למשתמש להזנת פרטי כרטיס
4. **עיבוד תשלום** ב-CARDCOM
5. **קבלת callback** עם תוצאות
6. **עדכון הזמנה** לפי תוצאות התשלום
7. **שליחת הודעות** ללקוחות ומטפלים

המערכת כוללת **logging מפורט**, **טיפול בשגיאות**, ו**rollback** במקרה של כישלון תשלום. 