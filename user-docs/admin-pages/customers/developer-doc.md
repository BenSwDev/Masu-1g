# קבצים ותלות הדף "לקוחות"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/customers/page.tsx` והוא מוגדר כעמוד דינמי (`export const dynamic = 'force-dynamic'`). העמוד מוודא שהמשתמש מחובר ובעל תפקיד "admin" באמצעות `requireUserSession` ומפנה לדאשבורד אם לא.

## רכיבים ופעולות
- **page.tsx** – מגדיר את מבנה העמוד ומטעין את רכיב הלקוח `CustomersClient` לאחר הצגת כותרת ו־`Separator`.
- **actions.ts** – מכיל את כל פעולות השרת עבור העמוד:
  - `getCustomerSummary` – מחזיר סטטיסטיקה ופעילות עבור לקוח ספציפי.
  - `getAllCustomers` – מחזיר רשימת לקוחות עם חיפוש, סינון לפי סוג משתמש ופאגינציה.
  - `getAllPurchaseTransactions` – מחזיר את כל העסקאות של לקוחות (נעזר ב־`actions/purchase-summary-actions.ts`).
- **components/dashboard/admin/customers/customers-client.tsx** – רכיב React צד לקוח המנהל את כל הלוגיקה בצד הדפדפן: טעינת נתונים, חיפוש, מיון, סינון, פאגינציה ותצוגת דיאלוג מפורט ללקוח.
- **components/common/purchase/purchase-history-table.tsx** – טבלת היסטוריית עסקאות המשמשת גם בדיאלוג פרטי הלקוח.
- **lib/auth/require-session.ts** – פונקציית עזר לבדיקת התחברות המשתמש.
- **מודלי Mongoose** – `lib/db/models/user.ts`, `booking.ts`, `user-subscription.ts`, `gift-voucher.ts` ועוד, הנדרשים בפעולות השרת.

## זרימת עבודה
1. טעינת העמוד בודקת הרשאות ומשתמשת ב־`CustomersClient` להצגת התוכן.
2. בצד הלקוח מופעלת `getAllCustomers` לטעינת הרשימה הראשונית. שינוי מסננים או מעבר עמוד מפעילים את אותה פעולה.
3. בחירת לקוח פותחת דיאלוג שמפעיל `getCustomerSummary` ו־`getAllPurchaseTransactions` להצגת פרטים מלאים והיסטוריית עסקאות.
4. כל פעולה בשרת מחזירה תוצאות כולל ספירה כוללת ומספר עמודים לצורך פאגינציה בצד הלקוח.

## תלות טכניות
העמוד משתמש ב־Next.js 13, React hooks, ספריית `lucide-react` לאייקונים, ורכיבי ממשק מותאמים (כגון `Button`, `Dialog`, `Table`). הנתונים נשמרים במונגו־די־בי דרך מודלי Mongoose ומתקבלים באמצעות פעולות Server Actions.
