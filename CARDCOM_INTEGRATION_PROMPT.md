# PROMPT לאינטגרציה של CARDCOM ב-Next.js 15 App Router

## הוראות ל-CURSOR AI

אני רוצה שתעזור לי להמיר את מערכת התשלומים המדומה הנוכחת שלי למערכת תשלומים אמיתית עם CARDCOM. 

**קודם כל - תבדוק את הפרויקט שלי:**

### שלב 1: ניתוח הפרויקט הקיים
1. **סרוק את כל הפרויקט** ומצא:
   - איפה נמצאת מערכת התשלומים המדומה הנוכחית
   - איך נראה הרכיב/החלון של התשלום
   - איפה יש כפתורי "דימוי הצלחה" ו"דימוי כישלון"
   - איך מתנהל state של הזמנות ותשלומים
   - איך נראה מבנה הנתונים (database schema)

2. **זהה את הטכנולוגיות המשמשות**:
   - MongoDB עם Mongoose (או MongoDB native driver)
   - Tailwind CSS עם shadcn/ui components
   - איך מתבצעת אימות (authentication)
   - איך מתנהלות הודעות/notifications

3. **מצא את הקבצים הרלוונטיים**:
   - רכיבי UI של תשלומים (shadcn/ui components)
   - API routes קיימים
   - MongoDB schemas/models
   - הגדרות environment variables

### שלב 2: הבנת הדרישות מ-CARDCOM
בהתבסס על הניתוח של מערכת PHP הישנה, אני צריך:

#### **פונקציונליות בסיסית:**
1. **תשלום ראשוני** - יצירת טוקן ב-CARDCOM
2. **חיובים נוספים** - חיוב ישיר עם טוקן שמור
3. **זיכויים** - החזרת כסף עם טוקן שמור
4. **ניהול תוצאות** - עיבוד callbacks מ-CARDCOM

#### **פרמטרים ל-CARDCOM API:**
```typescript
// יצירת תשלום
interface CreatePaymentRequest {
  TerminalNumber: string;
  UserName: string;
  APIKey: string;
  Operation: 1; // חיוב
  Currency: 1; // שקל
  Sum: number;
  Description: string;
  ReturnValue: string; // מזהה התשלום שלנו
  SuccessRedirectUrl: string;
  ErrorRedirectUrl: string;
  CreateToken: true; // חשוב!
}

// חיוב/זיכוי ישיר
interface DirectChargeRequest {
  TerminalNumber: string;
  UserName: string;
  APIKey: string;
  Operation: 1 | 2; // 1=חיוב, 2=זיכוי
  Currency: 1;
  Sum: number;
  Description: string;
  Token: string; // הטוקן השמור
  ReturnValue: string;
}
```

#### **מבנה נתונים נדרש (MongoDB):**
```typescript
// MongoDB Schema לתשלומים
const PaymentSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // מזהה ייחודי
  order_id: { type: String, required: true },
  pay_type: { 
    type: String, 
    enum: ['ccard', 'refund', 'cash'], 
    default: 'ccard' 
  },
  sub_type: { 
    type: String, 
    enum: ['direct', 'token', 'manual'], 
    default: 'direct' 
  },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date },
  sum: { type: Number, required: true },
  complete: { type: Boolean, default: false },
  has_token: { type: Boolean, default: false },
  transaction_id: { type: String },
  input_data: { type: mongoose.Schema.Types.Mixed },
  result_data: { type: mongoose.Schema.Types.Mixed }, // כולל tokenData
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// עדכון סכמת הזמנות
const OrderSchema = new mongoose.Schema({
  // שדות קיימים...
  cc_data: { type: mongoose.Schema.Types.Mixed }, // נתוני כרטיס אשראי
  fictive_status: { type: Number } // 21=חיוב, 22=זיכוי
});
```

### שלב 3: יישום המערכת
**אנא בצע את השלבים הבאים בסדר:**

#### 3.1 הכנת הסביבה
1. **הוסף environment variables** ל-.env.local:
```env
CARDCOM_TERMINAL_NUMBER=your_terminal_number
CARDCOM_USERNAME=your_username
CARDCOM_API_KEY=your_api_key
CARDCOM_BASE_URL=https://secure.cardcom.solutions/api/v11
CARDCOM_TEST_MODE=true
```

2. **עדכן את MongoDB schemas** (Mongoose models)

#### 3.2 יצירת API Routes
צור את הקבצים הבאים:

1. **`app/api/payments/create/route.ts`** - יצירת תשלום חדש
2. **`app/api/payments/callback/route.ts`** - קבלת תוצאות מ-CARDCOM
3. **`app/api/payments/direct/route.ts`** - חיוב/זיכוי ישיר
4. **`app/api/payments/[id]/details/route.ts`** - פרטי תשלום

#### 3.3 עדכון רכיבי UI
1. **החלף את הרכיב המדומה** ברכיב אמיתי שמתקשר עם CARDCOM
2. **הוסף רכיב חיוב/זיכוי** למקומות הרלוונטיים
3. **צור דפי תוצאות** (success/error pages)

#### 3.4 הוספת פונקציונליות נוספת
1. **שליחת אימיילים** לאחר תשלום מוצלח
2. **לוגים מפורטים** לכל הפעולות
3. **ניהול שגיאות** מקיף

### שלב 4: דרישות ספציפיות לביצוע

#### **התנהגות מדויקת כמו במערכת הישנה:**
1. **זרימת תשלום:**
   - לחיצה על כפתור תשלום → יצירת תשלום ב-CARDCOM → הפניה לדף CARDCOM
   - תשלום מוצלח → חזרה לאתר → עדכון סטטוס → שליחת אימייל
   - תשלום נכשל → חזרה לאתר → הודעת שגיאה

2. **שמירת טוקנים:**
   - כל תשלום מוצלח יוצר טוקן
   - הטוקן נשמר ב-`result_data` של הרשומה
   - מבנה: `{ tokenData: { token, last4, name, phone, email } }`

3. **חיובים/זיכויים נוספים:**
   - חיפוש הטוקן הראשון של ההזמנה
   - שימוש בטוקן לחיוב/זיכוי ישיר
   - יצירת רשומת תשלום חדשה
   - יצירת הזמנה פיקטיבית לתיעוד (fictive_status: 21/22)

#### **אבטחה וולידציה:**
1. **ולידצית callbacks** מ-CARDCOM
2. **הצפנת נתונים רגישים**
3. **לוגים מפורטים** (ללא פרטי אשראי)
4. **טיפול בשגיאות** רשת ועסקיות

### שלב 5: בדיקות
1. **צור מצב בדיקה** עם CARDCOM_TEST_MODE=true
2. **בדוק כל זרימה:**
   - תשלום מוצלח
   - תשלום נכשל
   - חיוב נוסף
   - זיכוי
3. **ודא שמירת נתונים** נכונה בבסיס הנתונים
4. **בדוק שליחת אימיילים**

### דוגמאות קוד לעזרה

#### רכיב תשלום בסיסי (shadcn/ui):
```typescript
// המר את הרכיב המדומה הקיים לזה:
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

export function PaymentModal({ orderId, amount, customerData, onSuccess, onError, onClose }) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          description: `הזמנה מספר ${orderId}`,
          customerData,
          successUrl: `${window.location.origin}/payment/success`,
          errorUrl: `${window.location.origin}/payment/error`
        })
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = data.paymentUrl; // הפניה ל-CARDCOM
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>תשלום בכרטיס אשראי</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-lg font-semibold">הזמנה מספר: {orderId}</p>
              <p className="text-2xl font-bold text-green-600">₪{amount}</p>
              <Button 
                onClick={handlePayment} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "מעבד..." : "תשלום בכרטיס אשראי"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
```

### הוראות חשובות:
1. **שמור על העיצוב הקיים** - אל תשנה את המראה, רק את הפונקציונליות
2. **התאם למבנה הקיים** - השתמש באותם patterns ו-conventions
3. **הוסף טיפול בשגיאות** מקיף
4. **צור קבצי טייפ** מתאימים
5. **הוסף הערות בעברית** לקוד החשוב

### תוצאה מצופה:
בסוף התהליך אני אוכל:
1. ללחוץ על כפתור תשלום ולהיות מועבר ל-CARDCOM האמיתי
2. לבצע תשלום אמיתי ולחזור לאתר עם תוצאות
3. לבצע חיובים וזיכויים נוספים עם הטוקן השמור
4. לראות את כל הפעולות בבסיס הנתונים
5. לקבל אימיילים אוטומטיים

**תתחיל בניתוח הפרויקט ותציג לי מה מצאת לפני שתתחיל ליישם!** 