# קבצים ותלות הדף "מנויים"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/subscriptions/page.tsx` והוא נרנדר באופן דינמי (`export const dynamic = 'force-dynamic'`). הדף משתמש ברכיבי צד-לקוח ובפעולות שרת לניהול רשימת המנויים.

## רכיבים ופעולות
- **page.tsx** – מוודא שהמשתמש מחובר באמצעות `requireUserSession`, טוען את נתוני המנויים (`getSubscriptions`) ואת רשימת הטיפולים הפעילים (`getAllTreatments`) ומעבירם ל־`SubscriptionsClient`.
- **actions.ts** – מכיל את כל פעולות השרת:
  - `createSubscription`
  - `updateSubscription`
  - `deleteSubscription`
  - `toggleSubscriptionStatus`
  - `getSubscriptions`
  - `getSubscriptionById`
  - `getActiveSubscriptions`
  - `getActiveSubscriptionsForPurchase`
  - `getAllTreatments`
  הפעולות מתחברות למסד הנתונים באמצעות `dbConnect`, מבצעות ולידציה עם `zod` ומשתמשות ב־`revalidatePath` לרענון הדף.
- **subscriptions-client.tsx** – רכיב צד לקוח שמנהל את מצבי הטעינה, החיפוש והפאגינציה. מפעיל את פונקציות `createSubscription`, `updateSubscription` ו־`deleteSubscription` דרך קריאות ל־`actions.ts` ומציג כרטיסי מנוי.
- **subscription-form.tsx** – טופס יצירה/עריכה המשתמש ב־`react-hook-form` וב־`zod` לצורך ולידציה לפני שליחת הנתונים.
- **subscription-card.tsx** – מציג פרטי מנוי בכרטיס אחד עם כפתורי עריכה ומחיקה.
- **מודל הנתונים** `lib/db/models/subscription.ts` – מגדיר את סכמת Mongoose לשמירת מנוי במסד הנתונים.
- **מודולי עזר** נוספים: `@/lib/auth/require-session`, `@/lib/auth/auth`, `@/lib/db/mongoose`, `@/lib/logs/logger`, `@/lib/translations/i18n`.

## זרימת עבודה
1. טעינת הדף מבצעת בדיקת התחברות ומביאה את נתוני המנויים והטיפולים.
2. `SubscriptionsClient` מציג את הרשימה הראשונית ומאפשר חיפוש, סינון לפי סטטוס, פאגינציה ופתיחת דיאלוגי יצירה/עריכה/מחיקה.
3. פעולות CRUD מתבצעות ב־`actions.ts`. לאחר כל פעולה מתבצע `revalidatePath` כדי לרענן את הנתונים בדף.
4. טפסי הוספה ועריכה שולחים נתונים דרך `FormData` ומקבלים הודעת הצלחה או שגיאה דרך `toast`.

## תלות טכניות
- Next.js (דפים דינמיים, server actions)
- React ו־TypeScript
- Mongoose עבור עבודה עם MongoDB
- Zod לוולידציה בטפסים ובפעולות שרת
- ספריית התרגום `lib/translations/i18n`
- רכיבי UI מותאמים (Card, Button, Input ועוד)
