# CARDCOM API Health Check Scripts 🏥

מערכת בדיקות מקיפה לוידוא תקינות CARDCOM API. הסקריפטים מאפשרים לבדוק את המערכת לפני deployment, לאתר בעיות ולוודא שהכל עובד כמתוכנן.

## 🚀 הסקריפטים הזמינים

### 1. בדיקה מהירה (Quick Check)
```bash
npm run cardcom:quick
```
**מה זה עושה:**
- ✅ בדיקת הגדרות בסיסיות
- ✅ בדיקת חיבור ל-CARDCOM API
- ✅ בדיקת יצירת תשלום במצב TEST
- ⏱️ רק בדיקות חיוניות - מהיר וקצר

**מתי להשתמש:**
- לפני push לפרודקשן
- בדיקה מהירה שהכל עובד
- CI/CD pipeline checks

---

### 2. בדיקה מקיפה (Full Health Check)
```bash
npm run cardcom:health
```
**מה זה עושה:**
- 🔧 בדיקת משתני סביבה מלאה
- 🌐 בדיקת חיבור ל-API
- 💳 בדיקת יצירת תשלומים
- ⏱️ בדיקת זמני תגובה
- ❌ בדיקת handling של שגיאות
- 📊 דוח מפורט עם כל התוצאות

**מתי להשתמש:**
- לאחר שינויים ב-API
- בדיקה מעמיקה של המערכת
- לפני deployment גדול
- לחקירת בעיות

---

### 3. בדיקת Endpoints ספציפיים
```bash
npm run cardcom:test-endpoints
```
**מה זה עושה:**
- 🧪 בדיקת `/LowProfile/Create`
- 🧪 בדיקת `/Transactions/Transaction`
- 🧪 בדיקת `/Transactions/RefundByTransactionId`
- 🧪 בדיקת תרחישי שגיאה
- 🧪 בדיקת validation של תגובות

**בדיקות ספציפיות:**
```bash
# בדיקת LowProfile בלבד
npm run cardcom:test-lowprofile

# בדיקת Transaction ישיר
npm run cardcom:test-transaction

# בדיקות ספציפיות
npm run cardcom:test-endpoints errors      # רק תרחישי שגיאה
npm run cardcom:test-endpoints validation  # רק validation
```

---

### 4. בדיקה מלאה (All Tests)
```bash
npm run cardcom:test-all
```
**מה זה עושה:**
- 🏃‍♂️ מריץ בדיקה מהירה
- 🔍 מריץ בדיקה מקיפה
- 📋 דוח סיכום מלא

## 🔧 דרישות מוקדמות

### התקנת Dependencies
```bash
npm install
```

### הגדרת משתני סביבה
וודא שהמשתנים הבאים מוגדרים (ב-Vercel או `.env.local`):

```bash
CARDCOM_TERMINAL=your_terminal_number
CARDCOM_API_TOKEN=your_api_token  
CARDCOM_BASE_URL=https://secure.cardcom.solutions/api/v11
CARDCOM_TEST_MODE=true  # true לבדיקות, false לפרודקשן
```

## 📊 פרשנות תוצאות

### Exit Codes
- **0** = כל הבדיקות עברו בהצלחה ✅
- **1** = יש בדיקות שנכשלו ❌

### סטטוסים
- **✅ PASS** = הבדיקה עברה בהצלחה
- **⚠️ WARN** = הבדיקה עברה אבל יש התראה (כמו זמני תגובה איטיים)
- **❌ FAIL** = הבדיקה נכשלה

### דוגמת פלט מוצלח
```
🚀 Starting CARDCOM API Health Check...

🧪 Running: Environment Variables
✅ Environment Variables - PASSED (2ms)

🧪 Running: Service Initialization  
✅ Service Initialization - PASSED (1ms)

🧪 Running: Test Connection
✅ Test Connection - PASSED (245ms)

🧪 Running: LowProfile Payment Creation
✅ LowProfile Payment Creation - PASSED (456ms)

🎉 ALL TESTS PASSED! CARDCOM API is healthy
```

## 🐛 פתרון בעיות נפוצות

### שגיאת 401 Unauthorized
```
❌ Test Connection - FAILED: HTTP 401: Unauthorized
```
**פתרון:**
- בדוק `CARDCOM_API_TOKEN` נכון
- בדוק `CARDCOM_TERMINAL` נכון  
- וודא שה-API key פעיל ב-CARDCOM

### שגיאת 404 Not Found
```
❌ Test Connection - FAILED: HTTP 404: Not Found
```
**פתרון:**
- בדוק `CARDCOM_BASE_URL` נכון
- וודא ש-endpoints נכונים (`/LowProfile/Create`)

### זמני תגובה איטיים
```
⚠️ Response Time Check - WARN: Slow response times: avg 6000ms
```
**משמעות:**
- הAPI עובד אבל איטי
- בדוק חיבור האינטרנט
- יכול להיות עומס על שרתי CARDCOM

### בעיות משתני סביבה
```
❌ Environment Variables - FAILED: Missing environment variables: CARDCOM_API_TOKEN
```
**פתרון:**
- וודא שכל המשתנים מוגדרים
- בVercel: Settings → Environment Variables
- בlocal: צור קובץ `.env.local`

## 🔐 אבטחה

### הגנה על Credentials
- ✅ הסקריפטים **לא יציגו** API tokens במלואם
- ✅ רק 3-4 תווים אחרונים יוצגו: `***fN`
- ✅ כל הלוגים מסונקרים ובטוחים

### הפעלה במצב TEST
- 🧪 תמיד הפעל עם `CARDCOM_TEST_MODE=true` לבדיקות
- 💰 במצב TEST לא יבוצעו חיובים אמיתיים
- 🎭 תגובות מדומות יחזרו במצב TEST

## 📈 שילוב ב-CI/CD

### GitHub Actions
```yaml
name: CARDCOM Health Check
on: [push, pull_request]

jobs:
  cardcom-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - name: Quick CARDCOM Check
        env:
          CARDCOM_TERMINAL: ${{ secrets.CARDCOM_TERMINAL }}
          CARDCOM_API_TOKEN: ${{ secrets.CARDCOM_API_TOKEN }}
          CARDCOM_BASE_URL: ${{ secrets.CARDCOM_BASE_URL }}
          CARDCOM_TEST_MODE: 'true'
        run: npm run cardcom:quick
```

### Vercel Deployment Hook
```bash
# במסגרת build process
npm run cardcom:quick
```

## 🆘 תמיכה

אם הסקריפטים מגלים בעיות:

1. **הפעל בדיקה מקיפה:** `npm run cardcom:health`
2. **בדוק לוגים מפורטים** בפלט הסקריפט
3. **צור קשר עם CARDCOM תמיכה** אם יש בעיות API
4. **עיין בדוקומנטציה** ב-`CARDCOM_IMPLEMENTATION_GUIDE.md`

## 🎯 Tips למפתחים

### הפעלה לפני commit
```bash
# הוסף ל-git hooks
npm run cardcom:quick && git commit
```

### בדיקה מתמדת
```bash
# בדיקה כל 5 דקות (למוניטורינג)
watch -n 300 'npm run cardcom:quick'
```

### לוגים מפורטים
הסקריפטים משתמשים ב-logger הפנימי של המערכת, אז הלוגים יישמרו גם ב-Vercel Analytics.

---

**🎉 עם הסקריפטים האלה תוכל להיות בטוח ש-CARDCOM API עובד מושלם!** 