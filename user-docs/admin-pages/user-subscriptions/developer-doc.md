# קבצים ותלות הדף "מנויי משתמשים"

דף הניהול הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/user-subscriptions/page.tsx` ומוצג באמצעות רינדור דינמי (`export const dynamic = "force-dynamic"`).

## רכיבים ופעולות
- **`page.tsx`** – טוען את נתוני הדף באמצעות `getAllUserSubscriptions` ומציג את `AdminUserSubscriptionsClient` בתוך `Suspense`. בעת כישלון טעינה מוצג רכיב שגיאה.
- **`actions.ts`** – אוסף פעולות שרת עבור הדף:
  - `getAllUserSubscriptions(options)` – מחזיר רשימת מנויים עם סינון, חיפוש ופאגינציה.
  - `createUserSubscription(formData)` – יוצר מנוי חדש עבור משתמש קיים.
  - `updateUserSubscription(id, formData)` – מעדכן כמות ותוקף של מנוי קיים.
- **`client-aware-user-subscriptions-loading.tsx`** – רכיב טעינה שמחליף בין תצוגת כרטיסים לטבלה לפי רוחב המסך.
- **רכיבי לקוח בתיקייה `components/dashboard/admin/user-subscriptions/`:**
  - `admin-user-subscriptions-client.tsx` – ניהול מצב, טעינת נתונים חוזרת, מסננים ופאגינציה.
  - `user-subscription-admin-card.tsx` ו־`user-subscription-row.tsx` – מציגים מנוי ככרטיס או שורה בטבלה.
  - `user-subscription-admin-card-skeleton.tsx` – שלד טעינה לכרטיס.
  - `create-user-subscription-form.tsx` – טופס יצירת מנוי חדש (עם ולידציה ב־Zod).
  - `user-subscription-form.tsx` – טופס עריכת מנוי קיים.
  - `user-subscription-details-modal.tsx` – חלון המציג את פרטי המנוי והזמנות קשורות.
- **מודלי נתונים** בתיקייה `lib/db/models/`:
  - `user-subscription.ts` – סכמת Mongoose למנוי משתמש.
  - `subscription.ts` – סכמת חבילת מנוי.
  - `treatment.ts` – סכמת טיפול, כולל משכי זמן ומחירים.
- **פעולות משותפות** בקובץ `actions/user-subscription-actions.ts` – פעולות רכישה, ביטול ומחיקה של מנוי המשותפות בין ממשקי המשתמש.

## זרימת עבודה
1. עם כניסת מנהל לדף מתבצעת בדיקה באמצעות `requireUserSession` לוודא הרשאת מנהל.
2. `page.tsx` מפעיל את `getAllUserSubscriptions` לקבלת הנתונים הראשוניים ומעבירם לרכיב הלקוח.
3. `AdminUserSubscriptionsClient` מנהל את החיפוש, הסינון, הפאגינציה והפעולות (יצירה, עריכה, רענון וייצוא). קריאות נוספות לשרת נעשות דרך הפונקציות ב־`actions.ts`.
4. פעולות ביטול ומחיקה מבוצעות דרך `cancelSubscription` ו־`deleteUserSubscription` בקובץ המשותף, ולאחריהן מתבצע `router.refresh()` ורענון הנתונים.
5. חלון הפרטים מושך הזמנות קשורות דרך `/api/admin/bookings` ומציגן למנהל.

## תלות טכניות
- Next.js 13 עם רינדור דינמי.
- מסד נתונים MongoDB דרך Mongoose.
- ספריית React Hook Form ו־Zod עבור טפסים.
- רכיבי ממשק מותאמים מ־ShadCN/UI.
- מערכת תרגום `@/lib/translations/i18n` להצגת טקסטים בעברית.
