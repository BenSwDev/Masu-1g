# מדריך CARDCOM - תשלום דרך IFRAME

## סקירה כללית

CARDCOM הוא שירות עיבוד תשלומים ישראלי שמאפשר לקבל תשלומי אשראי באופן מאובטח דרך iframe. המערכת תומכת במצבי TEST ו-PRODUCTION שנשלטים על ידי משתני סביבה.

## ארכיטקטורת התשלום

### זרימת IFRAME Payment
```
1. המשתמש מבקש לשלם
2. המערכת יוצרת "Low Profile Payment" ב-CARDCOM
3. CARDCOM מחזיר URL לטופס התשלום
4. המשתמש מועבר לטופס CARDCOM (iframe או redirect)
5. CARDCOM מעבד את התשלום ומחזיר תוצאות
6. המערכת מקבלת callback ומעדכנת את ההזמנה
```

### יתרונות ה-iframe
- **אבטחה**: פרטי האשראי לא עוברים דרך השרת שלך
- **PCI Compliance**: CARDCOM מטפל בכל דרישות האבטחה
- **טוקנים**: יכולת לשמור טוכן לחיובים עתידיים
- **ניסיון משתמש**: הלקוח נשאר באתר שלך

## הגדרות מצב TEST vs PRODUCTION

### שליטה דרך משתני סביבה
```bash
# מצב בדיקה (TEST)
CARDCOM_TEST_MODE=true

# מצב ייצור (PRODUCTION)  
CARDCOM_TEST_MODE=false
```

### ההבדלים בין המצבים

| מצב TEST | מצב PRODUCTION |
|----------|----------------|
| ✅ תשלומים מדומים | ✅ תשלומים אמיתיים |
| ✅ טוקנים מדומים | ✅ טוקנים אמיתיים |
| ✅ לוגים מפורטים | ⚠️ לוגים מינימלים |
| ✅ ללא עלות | 💰 עלות אמיתית |

### מעבר בין מצבים
המעבר נעשה **רק** על ידי שינוי משתה הסביבה ואתחול השירות:

```typescript
// לא צריך לשנות קוד - רק ENV variable
process.env.CARDCOM_TEST_MODE = "false"
// restart application
```

## API Endpoints של CARDCOM

### הנמקה לשימוש ב-endpoints הנוכחיים
לאחר בדיקות מעמיקות, הקוד משתמש ב-endpoints הבאים:

```typescript
// יצירת תשלום iframe
POST /api/v11/LowProfile/Create  // ✅ עובד לפי הדוקומנטציה הרשמית

// חיוב ישיר עם טוקן  
POST /api/v11/Transactions/Transaction  // ✅ עובד 

// החזר
POST /api/v11/Transactions/RefundByTransactionId  // ✅ עובד
```

**הערה חשובה**: לפי הדוקומנטציה הרשמית ב-swagger, ה-endpoints הנכונים כוללים את הפעולה המלאה (כמו `/Create`).

## מבנה הנתונים

### בקשת תשלום (Low Profile)
```typescript
{
  TerminalNumber: "מספר טרמינל",
  APIKey: "מפתח API", 
  Operation: 1, // תמיד 1 לחיוב
  Currency: 1, // תמיד 1 לשקל
  Sum: 150.50, // סכום בשקלים
  Description: "תיאור התשלום",
  ReturnValue: "מזהה_ייחודי", // המזהה שלך
  SuccessRedirectUrl: "https://domain.com/api/payments/callback?status=success",
  ErrorRedirectUrl: "https://domain.com/api/payments/callback?status=error",
  CustomerName: "שם הלקוח",
  CustomerEmail: "email@example.com", 
  CustomerPhone: "050-1234567",
  Language: "he"
}
```

### תגובת CARDCOM מוצלחת
```typescript
{
  ResponseCode: "0", // 0 = הצלחה
  Description: "Success",
  url: "https://secure.cardcom.solutions/pay/...", // קישור לתשלום
  LowProfileCode: "מזהה_עסקה_זמני"
}
```

### Callback Data (חזרה מהתשלום)
```typescript
{
  complete: "1", // 1 = הצליח, 0 = נכשל
  token: "1", // האם נוצר טוקן
  sum: "150.50",
  currency: "1", 
  ReturnValue: "המזהה_שלך",
  InternalDealNumber: "מספר_עסקה_של_CARDCOM",
  Last4: "1234", // 4 ספרות אחרונות
  Token: "טוקן_מוצפן" // אם נוצר
}
```

## קודי שגיאה נפוצים

| קוד | משמעות | פתרון |
|-----|---------|--------|
| 0 | הצלחה | ✅ |
| 1 | שגיאה כללית | בדוק פרמטרים |
| 2 | פרמטר חסר | בדוק שכל השדות הנדרשים קיימים |
| 3 | בעיה באימות | בדוק Terminal/API Key |
| 7 | תקלה בבנק | נסה שוב מאוחר יותר |
| 8 | כרטיס לא תקף | בקש מהלקוח כרטיס אחר |
| 9 | מסגרת חרגה | סכום גבוה מדי |

## דוגמת שימוש מעשית

### 1. יצירת תשלום
```typescript
const result = await cardcomService.createLowProfilePayment({
  amount: 150.50,
  description: "הזמנת טיפול ספא",
  paymentId: "order_12345",
  customerName: "דני כהן",
  customerEmail: "danny@example.com",
  customerPhone: "050-1234567"
})

if (result.success) {
  // הפנה ללקוח לכתובת התשלום
  window.location.href = result.data.url
}
```

### 2. טיפול ב-Callback
```typescript
// /api/payments/callback
export async function POST(request: Request) {
  const callbackData = await request.json()
  
  const result = cardcomService.processCallback(callbackData)
  
  if (result.success) {
    // עדכן הזמנה כמושלמת
    await updateBookingStatus(result.paymentId, 'paid')
    
    // שמור טוקן לשימוש עתידי  
    if (result.token) {
      await saveCustomerToken(result.paymentId, result.token, result.last4)
    }
  }
}
```

### 3. חיוב עתידי עם טוקן
```typescript
const result = await cardcomService.chargeToken({
  amount: 120.00,
  description: "חיוב מנוי חודשי", 
  token: "השמור_מהתשלום_הקודם",
  paymentId: "subscription_67890"
})
```

## אבטחה ותחזוקה

### עקרונות אבטחה
- ✅ **אסור לשמור פרטי אשראי** - רק טוקנים
- ✅ **HTTPS חובה** בייצור
- ✅ **ולידציה של Callbacks** 
- ✅ **הצפנת טוקנים** בבסיס הנתונים
- ✅ **לוגים ללא נתונים רגישים**

### מעקב ותחזוקה
```typescript
// בדיקת סטטוס התשלומים
const status = cardcomService.getStatus()

// בדיקת חיבור
const connection = await cardcomService.testConnection()

// מעבר למצב בדיקה זמנית (לצורך debug)
cardcomService.setTestMode(true)
```

### ניטור ביצועים מומלץ
- שיעור הצלחת תשלומים
- זמני תגובה ממוצעים
- שגיאות נפוצות
- התפלגות סכומי תשלום

## מעבר לייצור - Checklist

### לפני העלאה
- [ ] `CARDCOM_TEST_MODE=false` בייצור
- [ ] וידוא כל משתני הסביבה מוגדרים
- [ ] בדיקת `testConnection()` מחזירה success
- [ ] בדיקת callback URLs נגישים
- [ ] בדיקת HTTPS פעיל

### אחרי העלאה
- [ ] ביצוע תשלום ראשון בסכום קטן
- [ ] וידוא קבלת callback
- [ ] וידוא עדכון סטטוס הזמנה
- [ ] וידוא יצירת טוכן (אם נדרש)
- [ ] ניטור לוגים לשגיאות

---

**סיכום**: המערכת מיושרת לחלוטין עם CARDCOM API, תומכת במעבר קל בין מצבי TEST/PROD דרך ENV variables בלבד, ומספקת תשלומים מאובטחים דרך iframe. 