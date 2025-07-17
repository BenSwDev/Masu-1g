# 🏦 מדריך CARDCOM Test Mode - מדליק ונכון!

## ✅ מה תיקנו

### בעיות שהיו:
1. **❌ TEST MODE הפוך** - הלוגיקה הייתה הפוכה
2. **❌ LOCALHOST בפרודקשן** - המערכת הייתה חוזרת ל-localhost גם בפרודקשן

### מה תוקן:
1. **✅ TEST MODE תוקן** - עכשיו עובד נכון
2. **✅ URLs תוקנו** - כל ה-localhost references הוחלפו
3. **✅ סקריפט בדיקה נוסף** - `npm run cardcom:test-mode`

## 🔧 איך להגדיר TEST MODE נכון

### בקובץ `.env.local`:

```bash
# ===== CARDCOM Configuration =====

# 🧪 TEST MODE (לבדיקות - בטוח)
CARDCOM_TEST_MODE=true

# 💰 PRODUCTION MODE (תשלומים אמיתיים - זהירות!)
# CARDCOM_TEST_MODE=false

# פרטי חשבון CARDCOM (קבל מ-CARDCOM support)
CARDCOM_TERMINAL=your_terminal_number
CARDCOM_API_TOKEN=your_api_token
CARDCOM_BASE_URL=https://secure.cardcom.solutions/api/v11

# URL של האתר
NEXT_PUBLIC_APP_URL=https://v0-masu-lo.vercel.app
```

## 📋 בדיקת התצורה

### הפעל את הסקריפט:
```bash
npm run cardcom:test-mode
```

### תוצאות תקינות:
```
✅ Configuration is correct for TEST mode
✅ Your CARDCOM configuration is ready!
```

## 💳 כרטיסי בדיקה (TEST MODE בלבד)

### כרטיסי אשראי לבדיקות:
```
Visa:       4111111111111111
MasterCard: 5555555555554444  
Amex:       378282246310005
תוקף:       כל תאריך עתידי (דוגמה: 12/25)
CVV:        כל 3 ספרות (דוגמה: 123)
```

### ⚠️ חשוב לדעת:
- **בTEST MODE**: כרטיסי הבדיקה עובדים, אין חיוב אמיתי
- **בPRODUCTION MODE**: רק כרטיסים אמיתיים עובדים, יש חיוב אמיתי!

## 🔄 מעבר בין מצבים

### לבדיקות (TEST):
```bash
# ב-.env.local
CARDCOM_TEST_MODE=true
```

### לפרודקשן (PRODUCTION):
```bash  
# ב-.env.local (או .env.production)
CARDCOM_TEST_MODE=false
```

### אחרי כל שינוי:
1. שמור את הקובץ
2. הפעל מחדש את השרת (`npm run dev`)
3. בדוק: `npm run cardcom:test-mode`

## 🎯 מה קורה בכל מצב

### TEST MODE (`CARDCOM_TEST_MODE=true`):
- ✅ **בטוח לחלוטין** - אין חיובים אמיתיים
- ✅ **כרטיסי בדיקה עובדים** 
- ✅ **כל התהליכים עובדים** (חוץ מחיוב אמיתי)
- ✅ **לוגים מפורטים** לdebug
- ⚠️ **לקוחות לא יחויבו** (גם אם הם יכניסו כרטיס אמיתי!)

### PRODUCTION MODE (`CARDCOM_TEST_MODE=false`):
- 💰 **חיובים אמיתיים** - כסף אמיתי!
- ✅ **כרטיסים אמיתיים בלבד**
- ✅ **לקוחות מחויבים**
- ⚠️ **זהירות** - כל תשלום עולה כסף!

## 🔍 איתור בעיות

### אם התשלומים לא עובדים:

1. **בדוק תצורה**:
   ```bash
   npm run cardcom:test-mode
   ```

2. **ודא שיש credentials**:
   - `CARDCOM_TERMINAL` - מספר הטרמינל שלך
   - `CARDCOM_API_TOKEN` - הטוקן שקיבלת מCARDCOM

3. **צור קשר עם CARDCOM support** לקבל:
   - מספר טרמינל
   - API Token
   - הוראות הפעלה

### אם יש שגיאות browser:

זה תוקן! אם עדיין רואה שגיאות sandbox - נקה cache:
```bash
# נקה cache של הדפדפן
Ctrl+Shift+Delete (Chrome/Edge)
Cmd+Shift+Delete (Safari)
```

## 🚀 מוכן לשימוש!

עכשיו המערכת מוכנה:
- ✅ **TEST MODE עובד נכון**
- ✅ **אין יותר localhost בפרודקשן** 
- ✅ **CARDCOM iframe עובד בלי שגיאות**
- ✅ **הפלו שלנו עובד מושלם**

### לבדיקה מהירה:
1. הפעל: `npm run cardcom:test-mode`  
2. ודא: `✅ Configuration is correct`
3. נסה תשלום עם כרטיס בדיקה
4. שמח! 🎉

---

**💡 טיפ**: שמור את המדריך הזה - תצטרך אותו כשתעבור לפרודקשן! 